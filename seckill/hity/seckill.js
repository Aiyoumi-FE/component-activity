/* 秒杀组件
    功能：a、服务端时间不需要多次请求
        b、客户端时间校准
        c、模版自定义（当前模版无法实现UI需求时，可使用perCb进行定制）
    参数：
        style: 样式，会提供默认样式；
        template: 倒计时渲染的模版，其中包含关键子：
            a、$isBefore{xxx} 如果秒杀未开始，则露出xxx，否则不显示；
            b、$isIng{xxx} 如果秒杀进行中，则露出xxx，否则不显示；
            c、$isAfter{xxx} 如果秒杀已结束，则露出xxx，否则不显示；
            ($isIng||$isBefore||$isAfter{xxx}，支持以上三个元素的或逻辑)
            d、$Y: 年
            e、$M: 月
            f、$W: 周
            g、$D: 日
            h、$h: 时
            i、$m: 分
            j、$s: 秒
            k、$_100ms: 100ms
            如果包含$W，则日不大于7！
        el: 挂载点（默认为body）;
        pClass: 自定义秒杀组件容器的类;
        threshold: 检验客户端时间是否异常的阈值，单位ms; 必须大于during；默认为30s
        *getServerTime[与gap必有其一]: 获取服务端时间的函数，可校验客户端时间变化；要求其返回promise对象，resolve数据的结构为{success, serverTime};
        *gap[与getServerTime必有其一]: 服务端与客户端时间差 gap = frontTime - serverTime；
        *startTime[必须]: 秒杀开始时间；
        *endTime［必须］：秒杀结束时间；
        during: UI渲染频率，单位ms; 默认为100ms；
        perCb: 倒计时中的回调，dom挂载成功后，执行perCallback，其参数为Object，{ year, month, week, day, hour, minute, second, _100ms}
        beginSeckillCb: 秒杀开始时的回调；［参数同perCb］
        endSeckillCb: 秒杀结束时的回调。[无参数]

*************************/

const defaultStyle = '#seckill{width: 80%; margin: auto;} #seckill .time-block {display: inline-block; width: 14px; height: 20px; text-align: center; line-height: 20px; background-color: rgba(0, 0, 0, 0.6); color: #fff; margin: 0 1px;}#seckill .ms-block{background-color:green}'
const defaultTemplate = [
    '$isBefore{<span>即将开始</span>}',
    '$isIng{<span>进行中</span>}',
    '$isAfter{<span>已结束</span>}',
    '$isIng||$isBefore{<div>',
    '   $D 天 ， ',
    '   <span class="time-block">$h</span>',
    '   <span class="time-block">$h</span>',
    '   :',
    '   <span class="time-block">$m</span>',
    '   <span class="time-block">$m</span>',
    '   :',
    '   <span class="time-block">$s</span>',
    '   <span class="time-block">$s</span>',
    '    ',
    '   <span class="time-block ms-block">$_100ms</span>',
    '</div>}'
].join('')

const timeOptions = [{
    name: 'year',
    key: 'Y',
    mult: 365
}, {
    name: 'month',
    key: 'M',
    mult: 30
}, {
    name: 'week',
    key: 'W',
    mult: 7
}, {
    name: 'day',
    key: 'D',
    mult: 24
}, {
    name: 'hour',
    key: 'h',
    mult: 60
}, {
    name: 'minute',
    key: 'm',
    mult: 60
}, {
    name: 'second',
    key: 's',
    mult: 1000
}, {
    name: '_100ms',
    key: '_100ms',
    mult: 1
}]
const defaultThreshold = 10 * 1000
const defaultDuring = 100

class Seckill {
    constructor(options) {
        Object.assign(this, {
            style: defaultStyle,
            template: defaultTemplate,
            during: defaultDuring,
            threshold: defaultThreshold
        },
        options, {
            _isGetServerTimeValid: false, // 用于校验客户端时间
            _preClientTime: 0, // 用于校验客户端时间
            _moment: null, // 倒计时返回
            _beginSeckillCbDone: false // 开始秒杀回调是否执行
        })
    }

    init() {
        if (!this._checkAFormatData(this)) {
            return
        }

        this.el = !this.el ? document.querySelector('body') : this.el
        // style渲染
        this._renderStyle()

        // 获取服务端与客户端的时间差
        this._getGap().then(() => {
            // 开始倒计时
            this._moment = setTimeout(this._start.bind(this), this.during)
        }).catch((err) => {
            console.log(err)
        })
    }

    // 参数校验
    _checkAFormatData() {
        if (this.during < defaultDuring) {
            this.during = defaultDuring
        }

        if (!(typeof this.getServerTime === 'function' || this.gap)) {
            console.log('error, 参数 gap or getServerTime必须存在一个')
            return false
        }
        // 客户端时间异常检验阈值
        if (this.threshold < this.during || this.threshold < defaultThreshold) {
            this.threshold = this.during + defaultThreshold
        }

        this.startTime = this._formatDate(this.startTime)
        this.endTime = this._formatDate(this.endTime)
        if (this.startTime >= this.endTime) {
            console.log('error, 时间参数错误')
            return false
        }
        return true
    }

    _renderStyle() {
        let style = this.style
        if (typeof style === 'string' && style.trim()) {
            let styleElem = document.createElement('style')
            styleElem.innerHTML = style
            document.querySelector('head').append(styleElem)
        }
    }

    // 通过输入的函数获取服务端时间，如果有效，则给出标记；再判断gap是否有效，如果无效则报错，并停止函数
    _getGap() {
        return new Promise((resolve, reject) => {
            this.getServerTime ? this.getServerTime().then(({success, serverTime}) => {
                if (success) {
                    this._isGetServerTimeValid = true
                    this.gap = new Date() - this._formatDate(serverTime)
                }
                if (this.gap !== undefined) {
                    this._preClientTime = new Date()
                    resolve()
                } else {
                    console.log('error，缺少有效的gap参数')
                    reject()
                }
            }) : resolve()
        })
    }

    // 格式化时间，如果为number，则直接返回；如果为string，则将'-'格式转换成'/'，进行ios时间兼容
    _formatDate(date) {
        if (typeof date === 'number') {
            return date
        } else if (typeof date === 'string') {
            return new Date(date.replace(/-/g, '/')).getTime()
        } else {
            console.log('error 时间无效')
            return 0
        }
    }

    // 当前服务端时间
    _currServerTime() {
        return new Date() - this.gap
    }

    // 秒杀未开始
    _isBefore() {
        return this.startTime > this._currServerTime()
    }

    // 秒杀进行中
    _isIng() {
        return this._currServerTime() >= this.startTime && this._currServerTime() < this.endTime
    }

    // 秒杀结束
    _isAfter() {
        return this.endTime <= this._currServerTime()
    }

    // 当客户端时间变化大于阈值时，客户端时间异常：该时间小于
    _isValidClientTime() {
        return !this._isGetServerTimeValid || Math.abs(new Date() - this._preClientTime) < this.threshold
    }

    // 倒计时功能
    _start() {
        // 客户端时间校验
        if (!this._isValidClientTime()) {
            this._getGap().then(() => {
                this._start()
            }).catch((err) => {
                console.log(err)
            })
        } else {
            clearTimeout(this._moment)

            // 剩余时间
            let restTime = Math.abs((this._isBefore() ? this.startTime : this.endTime) - this._currServerTime())

            // 编译
            let rst = this._compile(restTime, this.template)

            // 挂载
            this._mount(rst.template, this.el, this.pClass)
            delete rst.template
            // 每次执行的回调
            this.perCb && this.perCb(rst)

            // 开始秒杀，执行回调
            if (this._isIng() && this.beginSeckillCb && !this._beginSeckillCbDone) {
                this.beginSeckillCb && this.beginSeckillCb(rst)
                this._beginSeckillCbDone = true
            }

            // 纪录当前客户端时间,用于校验
            this._preClientTime = new Date()

            // 结束时，执行结束回调
            if (this._isAfter()) {
                this.endSeckillCb && this.endSeckillCb(rst)
            } else {
                this._moment = setTimeout(this._start.bind(this), this.during)
            }
        }
    }

    // 挂载
    _mount(template, el, pClass) {
        let pElem = document.querySelector('#seckill')

        if (!pElem) {
            pElem = document.createElement('div')
            pElem.id = 'seckill'
            pElem.className = !pClass ? '' : pClass
            el.append(pElem)
        }

        pElem.innerHTML = template
    }

    _compile(restTime, template) {
        // 提取模版选项
        let restOptions = this._computeRestOptions(timeOptions, template)

        // 根据模版选项，计算出时间结果对象
        let timeObj = this._computeTime(restOptions, restTime)

        // 处理模版的展现逻辑
        template = this._compileDisplay(template)

        // 模板时间值替换
        template = this._compileTime(template, timeObj, restOptions)

        return {
            template,
            time: timeObj,
            state: {
                isIng: this._isIng(),
                isBefore: this._isBefore(),
                isAfter: this._isAfter()
            }
        }
    }

    // 提取模版包含的时间参数
    _computeRestOptions(timeOptions, template) {
        return timeOptions.filter((item) => {
            return template.indexOf('$' + item.key) != -1
        })
    }

    // 根据时间参数，计算出对应的时间值
    _computeTime(restOptions, restTime) {
        let timeObj = {}
        // 计算剩余项目的结果
        restOptions.forEach((item, index) => {
            let oriIndex = 0
            timeOptions.some((e, i) => {
                oriIndex = i
                return e.name == item.name
            })
            let sum = timeOptions.slice(oriIndex)
                .map(item => item.mult)
                .reduce((x, y) => {
                    return x * y
                })
            // 如果是年或者月，去除周的影响
            if (item.key === 'Y') {
                sum = sum / (7 * 30)
            }
            if (item.key === 'M') {
                sum = sum / 7
            }
            if (item.key === '_100ms') {
                sum = sum * 100
            }

            timeObj[item.name] = Math.floor(restTime / sum)
            restTime = restTime % sum
        })
        return timeObj
    }

    // 处理模版的展现逻辑
    _compileDisplay(template) {
        let reg = new RegExp(/((\$(isIng|isBefore|isAfter)\|\|)*)(\$(isIng|isBefore|isAfter)\{([^\}]+)\})/i)
        while (reg.test(template)) {
            let regexp1 = RegExp.$1
            let regexp4 = RegExp.$4
            let regexp5 = RegExp.$5
            let regexp6 = RegExp.$6

            // 包含或运算
            if (regexp1) {
                let stateArray = regexp1.slice(0, regexp1.length - 2)
                    .replace(/\$/g, '')
                    .split('||')
                regexp5 && stateArray.push(regexp5)
                let state = stateArray.some(item => this['_' + item]())
                template = template.replace(regexp1 + regexp4, state ? regexp6 : '')
            } else if (regexp4) {
                template = template.replace(regexp4, this['_' + regexp5]() ? regexp6 : '')
            }
        }
        return template
    }

    // 模板时间值替换
    _compileTime(template, timeObj, restOptions) {
        restOptions.forEach((item) => {
            //  找出key的数量，进行相应替换
            let keyArray = template.match(new RegExp('\\$' + item.key, 'g'))
            let value = timeObj[item.name].toString()

            // 数值字符长度不够，用0补充
            if (keyArray && keyArray.length) {
                value = value.padStart(keyArray.length, '0')
            }

            // 将对应数值填坑
            let start = 0
            let count = 0
            keyArray && keyArray.forEach((item, index) => {
                if (index === 0) {
                    count = value.length - keyArray.length + 1
                } else {
                    count = 1
                }
                template = template.replace(item, value.substr(start, count))
                start += count
            })
        })
        return template
    }
}

export default Seckill
