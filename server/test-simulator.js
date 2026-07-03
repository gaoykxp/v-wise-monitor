/**
 * 测试模拟器 - 模拟车辆SDK向MQTT Broker发布数据
 * 用于验证后端MQTT订阅和数据转换逻辑
 *
 * 使用方法:
 * 1. 先启动MQTT Broker (如 mosquitto)
 * 2. 启动后端: node app.js
 * 3. 运行本脚本: node test-simulator.js
 * 4. 在浏览器打开 http://localhost:3000 查看数据
 */

const mqtt = require('mqtt');

const BROKER = 'mqtt://172.20.10.9:1883';
const TOPIC_PREFIX = 'v-wise-network/';

// 模拟设备IMEI列表
const testDevices = [
    { imei: '868220032249473', modelId: 'VM004' },
    { imei: '868220032249471', modelId: 'VM002' },
    { imei: '868220032249472', modelId: 'VM003' }
];

// 网络制式选项
const netTypes = ['LTE', 'NR', 'WCDMA', 'GSM'];
// 注册状态选项
const regStats = ['REGISTERED_HOME', 'REGISTERED_ROAMING', 'NOT_REGISTERED', 'REGISTRATION_FAILED'];

const client = mqtt.connect(BROKER, {
    clientId: 'v-wise-monitor-client002',
    username: 'v-wise-monitor-client002',
    password: '123456'
});

function publishMessage(topic, message) {
    const payload = JSON.stringify(message);
    console.log('[模拟器] Publish topic:', topic);
    console.log('[模拟器] Publish message:', payload);
    client.publish(topic, payload);
}

client.on('connect', () => {
    console.log('[模拟器] 已连接到MQTT Broker');
    console.log('[模拟器] 开始发布模拟数据...');

    // 每个设备先发送上线消息
    testDevices.forEach(device => {
        const onlineTopic = TOPIC_PREFIX + device.imei + '/user/online';
        publishMessage(onlineTopic, { imei: device.imei });
        console.log(`[模拟器] 设备上线: ${device.imei}`);
    });

    // 每5秒发送一次数据上报
    setInterval(() => {
        testDevices.forEach(device => {
            const dataTopic = TOPIC_PREFIX + device.imei + '/data/up';
            const payload = generateDataReport(device.imei);
            publishMessage(dataTopic, payload);
        });
        console.log(`[模拟器] 已发布 ${testDevices.length} 台设备的数据`);
    }, 5000);

    // 每30秒发送一次心跳
    setInterval(() => {
        testDevices.forEach(device => {
            const heartbeatTopic = TOPIC_PREFIX + device.imei + '/heartbeat';
            publishMessage(heartbeatTopic, {
                task_list: [{ task_id: 'task_001', status: 0 }]
            });
        });
    }, 30000);

    // 每10秒发送一次Ping测试结果
    setInterval(() => {
        const device = testDevices[Math.floor(Math.random() * testDevices.length)];
        const pingTopic = TOPIC_PREFIX + device.imei + '/ping/up';
        publishMessage(pingTopic, {
            task_id: 'ping_task_001',
            time: Date.now(),
            lose_rate: Math.floor(Math.random() * 5),
            delay: Math.floor(Math.random() * 100) + 10,
            latitude: 39.9042 + (Math.random() - 0.5) * 0.3,
            longitude: 116.4074 + (Math.random() - 0.5) * 0.5,
            altitude: 50 + Math.random() * 100
        });
    }, 10000);
});

client.on('error', (err) => {
    console.error('[模拟器] MQTT错误:', err.message);
});

/**
 * 生成模拟的数据上报 (与SDK probe_mgr.cpp 格式一致)
 */
function generateDataReport(imei) {
    const netType = netTypes[Math.floor(Math.random() * netTypes.length)];
    const regStat = regStats[Math.floor(Math.random() * regStats.length)];

    return {
        system: {
            cpu_util: Math.floor(20 + Math.random() * 60),
            imei: imei,
            sn: `SN${imei.slice(-8)}`,
            sw_version: '2.4.0',
            hw_version: '1.0',
            mem_util: Math.floor(30 + Math.random() * 50),
            timestamp: Date.now(),
            net_delay: Math.floor(Math.random() * 100) + 10,
            net_loss: Math.floor(Math.random() * 5),
            longitude: 116.4074 + (Math.random() - 0.5) * 0.5,
            latitude: 39.9042 + (Math.random() - 0.5) * 0.3,
            altitude: 50 + Math.random() * 100
        },
        sim_card: {
            imsi: `46013880050${imei.slice(-4)}`,
            iccid: `898608081923${imei.slice(-7)}`,
            status: 'READY'
        },
        wireless: {
            net_type: netType,
            rsrp: Math.floor(-80 - Math.random() * 30),
            rsrq: Math.floor(-5 - Math.random() * 15),
            sinr: Math.floor(5 + Math.random() * 20),
            cid: String(Math.floor(Math.random() * 10000000) + 1000000),
            tac: String(Math.floor(Math.random() * 65535) + 1),
            reg_err_code: regStat === 'REGISTRATION_FAILED' ? Math.floor(Math.random() * 100) : 0,
            reg_stat: regStat,
            apn: 'cmnet'
        }
    };
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n[模拟器] 停止发布');
    client.end();
    process.exit(0);
});
