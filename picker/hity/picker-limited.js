/* picker组件
    功能：
        a、受UI控制，实现有限级的数据展现；
        b、请求数据缓存，加速数据返回；
        c、增加数据请求的时序控制；
        d、交互touchmove的有效性控制；
        e、限頻：UI更新100ms/touchmove，数据更新1000ms/touchmove，touchend时，立即开启数据请求；
        f、支持级联；
        g、支持列表单列dom自定义；
        h、使用getComputedStyle获取行高，保留了小数点更为精确
    参数：
        style: 样式，会提供默认样式；
        template: 如默认模版，{{xxx}}，其中的xxx为list中对象属性;
        el: 挂载点（默认为body）;
        pClass: 自定类;
        defaultTarget: 默认值；与target的结构相同
        isCascade: 是否级联，默认级联。如果级联打开，当list为空时，则停止级联
        *getList: type: function;
            输入：
                target: type: array，返回选中结果数组，
                index：当前请求第几个面板数据；
            输出：
                promise, {success, list, isDone}
                其中 list为对象数组[{},{}]，每个对象包含模版所需的属性
        done: 回调函数，当picker整体选择完毕以后，调用该函数；返回选中的target
*************************/
/* global alert */
import { throttle } from './utils'

const defaultStyle = [
    '.picker * {margin: 0; padding: 0;}',
    '.picker {z-index: 10; position:relative; width: 100%; height: 100%; display: flex; overflow:hidden;}',
    '.picker ul{position: relative; height:auto; top: 50%; flex: 1 1; list-style: none;}',
    'li {line-height: 30px; overflow: hidden; width: 100%; height: 30px; line-height: 30px; text-align: center;}',
    '.target-line {z-index: -1; width: 100%; height: 30px; position: absolute; top:50%; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;}'
].join('')

const defaultLiTemplate = '<li key="{{id}}">{{value}}</li>'

class Picker {
    constructor(options) {
        Object.assign(this, {
            style: defaultStyle,
            liTemplate: defaultLiTemplate,
            defaultTarget: [],
            isCascade: true
        },
        options, {
            _target: [],
            _list: [],
            _pElem: null,
            _currSequenceNum: [], // 当前插入面板的数据为第n个数据请求，用于处理异步请求时序
            _latestSequenceNum: 0, // 最新请求的序号，用于处理异步请求时序
            _requestRstBuff: new Map(), // 缓存数据请求的结果，加速数据返回,map结构
            _touchIndex: -1, // 标记当前数据请求通过那个面板触发，用于处理异步请求时序 如果有级联，当高级面板触发的请求未结束时，不能继续操作面板
            _translateY: [],
            _lineHeight: 0
        })
    }

    init() {
        if (typeof this.getList !== 'function') {
            console.log('error getList为函数')
            return
        }

        this.el = !this.el ? document.querySelector('body') : this.el
        // style渲染
        this._renderStyle()
        this._target = this.defaultTarget
        this._handleWholePanel(0)
    }

    // 获取数据
    _getDataByNet(index) {
        return new Promise((resolve, reject) => {
            // 获取list数据
            this.getList(this._target, index).then(({success, list, isDone}) => {
                if (success) {
                    resolve({list, isDone})
                }
            }).catch((err) => {
                resolve({
                    list: [],
                    isDone: false
                })
                console.log(err)
            })
        })
    }

    // 样式渲染
    _renderStyle() {
        let style = this.style
        if (typeof style === 'string' && style.trim()) {
            let styleElem = document.createElement('style')
            styleElem.innerHTML = style
            document.querySelector('head').appendChild(styleElem)
        }
    }

    // 挂载
    _mount(template, el, pClass, index) {
        let pElem = this._pElem

        if (!pElem) {
            pElem = document.createElement('div')
            pElem.className = 'picker ' + (!pClass ? '' : pClass)
            el.appendChild(pElem)
            pElem.innerHTML = '<div class="target-line"></div>'
            this._pElem = pElem
            this._pElem.addEventListener('touchmove', (event) => {
                // alert('event' + event.target.nodeType)
            }, false)
        }

        let ulElem = this._pElem.querySelector('.column-' + index)
        if (!ulElem) {
            ulElem = document.createElement('ul')
            ulElem.className = 'column-' + index
            ulElem.innerHTML = template
            pElem.appendChild(ulElem)

            // 取得行高
            if (!this._lineHeight) {
                this._lineHeight = Number(
                    window.getComputedStyle(
                        ulElem.querySelector('li'), null
                    ).lineHeight
                        .split('px')[0])
            }

            // 根据默认值，进行ui初始化
            if (this.defaultTarget && this.defaultTarget.length) {
                this._renderInitUi(ulElem, index)
            }

            // 新建ul列表时，注册交互事件
            this._registerUlEvent(ulElem, index)
        } else {
            ulElem.innerHTML = template
        }
    }

    // 编译模版，填充值
    _compile(liTemplate, list) {
        let reg = new RegExp(/(\{\{([^\}]+)\}\})/g)
        return list.map(item => {
            let template = liTemplate
            while (reg.test(liTemplate)) {
                let value = item[RegExp.$2]
                if (!value) {
                    value = ''
                    console.log('error, 该变量不存在')
                }
                template = template.replace(RegExp.$1, value)
            }
            return template
        }).join('')
    }

    // 处理整个面板
    _handleWholePanel(index) {
        let latestSequenceNum = this._latestSequenceNum++

        this._handleOneColumn(index, latestSequenceNum)
        return true
    }

    // 处理单个面板的数据获取及编译、挂载
    _handleOneColumn(index, mySequenceNum) {
        this._getData(index, mySequenceNum).then(({list, isDone}) => {
            if (list && list.length > 0) {
                this._handleData(list, index, mySequenceNum)
            } else {
                this._resetState(index, mySequenceNum)
                isDone && this.done && this.done(this._target)
            }
        })
    }

    // 获取数据，通过内存或者数据回调函数
    _getData(index, mySequenceNum) {
        return new Promise((resolve, reject) => {
            let firstTargetValue = Symbol('first')
            let targetValue = index == 0 ? firstTargetValue : this._target[index - 1]
            let rst = {}

            if (this._requestRstBuff.has(targetValue)) {
                rst = this._requestRstBuff.get(targetValue)
                resolve(rst)
            } else {
                this._getDataByNet(index).then((rst) => {
                    // 当请求数据的序列号 大于 已插入面板的数据序列号时，数据有效；否则无效丢弃
                    if (!mySequenceNum || mySequenceNum > this._currSequenceNum[index]) {
                        // 存入内存中
                        this._requestRstBuff.set(targetValue, rst)
                        resolve(rst)
                    }
                })
            }
        })
    }
    _resetState(index, mySequenceNum) {
        this._currSequenceNum[index] = mySequenceNum
        this._touchIndex = -1
        this.defaultTarget = []
    }
    // 对数据进行编译、挂载、级联判断等处理
    _handleData(list, index, mySequenceNum) {
        this._list[index] = list
        if (!this.defaultTarget || !this.defaultTarget.length) {
            this._target[index] = list[0]
        }

        // 获取模版
        let template = this._compile(this.liTemplate, list)

        // 挂载
        this._mount(template, this.el, this.pClass, index)

        // 设置当前的数据时序
        this._currSequenceNum[index] = mySequenceNum
        if (this.isCascade) {
            this._handleOneColumn(index + 1, mySequenceNum)
        } else {
            this._resetState(index, mySequenceNum)
        }
    }

    // 初始化时，渲染UI
    _renderInitUi(ulElem, index) {
        let targetIndex = 0
        this._list[index].forEach((item, tIndex) => {
            if (this._deepEqual(item, this._target[index])) {
                targetIndex = tIndex
            }
        })
        this._translateY[index] = -1 * targetIndex * this._lineHeight
        ulElem.style.transform = 'translate(0, ' + this._translateY[index] + 'px)'
    }

    // touch时，面板的UI渲染
    _renderTouchUi(touchInfo, ulElem, index, touchType) {
        this._pElem.querySelectorAll('ul').forEach((item, tIndex) => {
            if (tIndex > index) {
                item.style.transform = 'translate(0, 0)'
                this._translateY[tIndex] = 0
            }
        })
        let {
            preTouchY,
            currTouchY
        } = touchInfo
        let lineHeight = this._lineHeight
        let translateY = this._translateY[index]

        let maxY = 0
        let minY = -1 * (this._list[index].length - 1) * lineHeight

        let touchGap = (preTouchY - currTouchY)
        let yGap = -1 * touchGap / 2

        // 到达底部，做上拉操作
        if (translateY == minY && (translateY + yGap) < minY) {
            return
        }

        // 到达底部，做下拉操作
        if (translateY == maxY && (translateY + yGap) > maxY) {
            return
        }

        if ((translateY + yGap) >= minY && (translateY + yGap) <= maxY) {
            translateY += yGap
            // touchend时，校准位置
            if (touchType === 'end') {
                translateY = (translateY / lineHeight).toFixed(0) * lineHeight
            }
        } else if ((translateY + yGap) < minY) {
            translateY = minY
        } else if ((translateY + yGap) > maxY) {
            translateY = maxY
        }
        ulElem.style.transform = 'translate(0, ' + translateY + 'px)'
        this._translateY[index] = translateY
        this._target[index] = this._list[index][Math.floor(Math.abs(translateY / lineHeight))]
    }

    // 注册事件
    _registerUlEvent(ulElem, index) {
        let renderTouchUi = throttle(this._renderTouchUi, 50, this)
        let handleWholePanel = throttle(this._handleWholePanel, 500, this)
        let touchInfo = {
            preTouchY: 0,
            currTouchY: 0
        }
        ulElem.addEventListener('touchstart', (event) => {
            event.preventDefault()
            event.stopPropagation()
            touchInfo.preTouchY = event.touches[0].clientY
        })

        ulElem.addEventListener('touchmove', (event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!(this._touchIndex != -1 && (index + 1) > this._touchIndex && this.isCascade)) {
                this._touchIndex = index + 1
                touchInfo.currTouchY = event.touches[0].clientY
                renderTouchUi(touchInfo, ulElem, index, 'move')
                handleWholePanel(index + 1)
            }
        }, false)

        ulElem.addEventListener('touchend', (event) => {
            event.preventDefault()
            event.stopPropagation()
            this._renderTouchUi(touchInfo, ulElem, index, 'end')
            this._handleWholePanel(index + 1)
        }, false)
    }
    // 限流
    _throttle(fn, delay, ctx) {
        let isAvail = true
        let movement = null
        return function() {
            let args = arguments
            if (isAvail) {
                fn.apply(ctx, args)
                isAvail = false
                clearTimeout(movement)
                movement = setTimeout(() => {
                    isAvail = true
                }, delay)
            }
        }
    }

    // 深度判断两个变量是否相等
    _deepEqual(obj1, obj2) {
        if (obj1 instanceof Array) {
            if (!(obj2 instanceof Array)) {
                return false
            }
            if (obj1.length != obj2.length) {
                return false
            }
            return obj1.every((item, index) => {
                return this._deepEqual(obj1[index], obj2[index])
            })
        }

        if (obj1 instanceof Object) {
            if (!(obj2 instanceof Object)) {
                return false
            }
            if (Object.keys(obj1).length !== Object.keys(obj2).length) {
                return false
            }
            return Object.keys(obj1).every(key => {
                return this._deepEqual(obj1[key], obj2[key])
            })
        }

        return obj1 === obj2
    }
}

export default Picker
