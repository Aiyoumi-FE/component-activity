# seckill
功能特性：
a、服务端时间不需要多次请求
b、客户端时间校准
c、模版自定义（当前模版无法实现UI需求时，可使用perCb进行定制）
d、单元测试

组件使用方法：
import Seckill from './seckill'

new Seckill({
    endTime: '2018-3-29 11:00:00',
    startTime: '2018-3-23 15:00:00',
    getServerTime: () => {
        return new Promise((resolve, reject) => {
            axios.get('/common/getNow').then(({data: {success, result}}) => {
                resolve({
                    success,
                    serverTime: result
                })
            })
        })
    }
}).init()

单元测试：
mocha --compilers js:babel-core/register ./seckill.test.js

详细使用说明：
http://www.cnblogs.com/hity-tt/p/8658406.html
