/* picker组件
    功能：
        a、可实现无限级数据的展现；
        b、请求数据缓存，加速数据返回；
        c、增加数据请求的时序控制；
        d、支持列表单列dom自定义；
    参数：
        style: 样式，会提供默认样式；
        navLiTemplate: 模版；{{value}}其中的value为选中的item的属性，item与list中的item属性相同;
        columnLiTemplate: 模版；{{value}}其中的value为getList返回的list中item的属性;
        el: 挂载点（默认为body）;
        pClass: 自定义秒杀组件容器的类;
        defaultTarget: 默认值；与target的结构相同
        *getList: type: function;
            输入：
                target: type: array，返回选中结果数组，
                index：当前请求第几个面板数据；
            输出：
                promise, {success, list}
                其中 list为数组，包含每个item的数据 如[{value: xxx, id:xxx}]
        done: 回调函数，当picker整体选择完毕以后，调用该函数；返回选中的target
*************************/

const defaultStyle = [
    '.picker * {margin: 0; padding: 0;}',
    '.picker {position:relative; width: 100%; height: 100%; background: #fff;}',
    '.picker .nav{position: relative; height:30px; line-height:30px; list-style: none; display: flex; border-bottom: 1px solid #e4e4e4; padding: 0 12px;}',
    '.picker .nav li{padding-right: 10px; overflow: scroll;}',
    '.picker .column-frame {position: relative; width: 100%; height: 100%; transition: transform 500ms;}',
    '.column-frame ul {position:absolute; top: 5px; list-style: none; width:100%; height: 80%; line-height: 24px; padding: 0 12px; overflow: scroll;}',
    '.column-frame .active {color: red;}',
    '.nav .active {border-bottom: 1px solid red;}'
].join('')

const defaultNavLiTemplate = '<li key="{{id}}">{{value}}</li>'
const defaultColumnLiTemplate = '<li key="{{id}}">{{value}}</li>'

class Picker {
    constructor(options) {
        Object.assign(this, {
            style: defaultStyle,
            navLiTemplate: defaultNavLiTemplate,
            columnLiTemplate: defaultColumnLiTemplate,
            defaultTarget: []
        },
        options, {
            _finished: false,
            _target: [],
            _list: [],
            _pElem: null,
            _navElem: null,
            _currSequenceNum: [], // 当前插入面板的数据为第n个数据请求，用于处理异步请求时序
            _latestSequenceNum: [], // 最新请求的序号，用于处理异步请求时序
            _requestRstBuff: new Map() // 缓存数据请求的结果，加速数据返回,map结构
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
        this._handleOneColumn(0)
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
            document.querySelector('head').append(styleElem)
        }
    }

    _mountNav(navLiTemplate) {
        let navElem = this._pElem.querySelector('.nav')
        if (!this._finished) {
            navLiTemplate += '<li index=-1 style="color:red;">请选择</li>'
        }
        navElem.innerHTML = navLiTemplate
        this._renderUi(navElem.querySelectorAll('li'), navElem.lastChild)
    }

    _mountColumn(columnLiTemplate, index) {
        let columnFrame = this._pElem.querySelector('.column-frame')
        let ulElem = columnFrame.querySelector('.column-' + index)
        if (!ulElem) {
            ulElem = document.createElement('ul')
            ulElem.className = 'column-' + index
            ulElem.innerHTML = columnLiTemplate
            ulElem.style.left = 100 * index + '%'
            columnFrame.append(ulElem)
            // 新建ul列表时，注册交互事件
            this._registerColumnEvent(ulElem, index)
        } else {
            ulElem.innerHTML = columnLiTemplate
        }
    }
    // 挂载
    _mountPElem(el, pClass, index) {
        let pElem = this._pElem

        if (!pElem) {
            pElem = document.createElement('div')
            pElem.className = 'picker ' + (!pClass ? '' : pClass)
            pElem.innerHTML = '<ul class="nav"></ul><div class="column-frame"></div>'
            el.append(pElem)
            this._pElem = pElem
            let navElem = this._pElem.querySelector('.nav')
            this._registerNavEvent(navElem)
        }
    }

    // 编译模版，填充值
    _compile(liTemplate, list, columnIndex) {
        let reg = new RegExp(/(\{\{([^\}]+)\}\})/g)
        return list.map((item, index) => {
            let template = liTemplate
            while (reg.test(liTemplate)) {
                let value = item[RegExp.$2]
                if (!value) {
                    value = ''
                    console.log('error, 该变量不存在')
                }
                template = template.replace(RegExp.$1, value)
            }
            if (this._deepEqual(item, this.defaultTarget[columnIndex])) {
                template = template.replace('<li', '<li class="active" ')
            }
            return template.replace('<li', '<li index="' + index + '" ')
        }).join('')
    }

    _reset(index, mySequenceNum) {
        this.defaultTarget = []
        this._currSequenceNum[index] = mySequenceNum
        this._finished = true
    }
    // 处理单个面板的数据获取及编译、挂载
    _handleOneColumn(index) {
        let mySequenceNum = this._latestSequenceNum[index]++
        this._finished = false
        this._getData(index, mySequenceNum).then(({list, isDone}) => {
            if (list && list.length > 0) {
                this._handleData(list, index, mySequenceNum)
                if (this.defaultTarget && this.defaultTarget.length) {
                    this._handleOneColumn(index + 1)
                }
            } else {
                this._reset(index, mySequenceNum)
                if (isDone) {
                    this.done && this.done(this._target)
                    // 获取模版
                    let navLiTemplate = this._compile(this.navLiTemplate, this._target, index)
                    this._mountNav(navLiTemplate)
                }
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
    // 对数据进行编译、挂载、级联判断等处理
    _handleData(list, index, mySequenceNum) {
        this._list[index] = list

        // 挂载
        if (!this._pElem) {
            this._mountPElem(this.el, this.pClass, index)
        }
        // 获取模版
        let navLiTemplate = this._compile(this.navLiTemplate, this._target, index)
        this._mountNav(navLiTemplate)

        let columnLiTemplate = this._compile(this.columnLiTemplate, list, index)
        this._mountColumn(columnLiTemplate, index)
        this._translateColumn(index)

        // 设置当前的数据时序
        this._currSequenceNum[index] = mySequenceNum
    }

    _renderUi(liElems, targetNode) {
        liElems.forEach(item => {
            item.classList.remove('active')
        })
        targetNode.classList && targetNode.classList.add('active')
    }

    _translateColumn(index) {
        let columnFrame = this._pElem.querySelector('.column-frame')
        let ulElem = columnFrame.querySelector('.column-' + index)
        let activeElem = ulElem.querySelector('.active')
        columnFrame.style.transform = 'translate(' + (-1 * index * 100) + '%, 0)'
        if (activeElem) {
            ulElem.scrollTop = ulElem.querySelector('.active').offsetTop
        }
    }
    // 注册事件
    _registerNavEvent(navElem, index) {
        navElem.addEventListener('click', (event) => {
            if (event.target.nodeName == 'LI') {
                let liElems = navElem.querySelectorAll('li')
                this._renderUi(liElems, event.target)
                let index = event.target.getAttribute('index')
                index = index == -1 ? (liElems.length - 1) : index
                this._translateColumn(index)
            }
        })
    }

    // 注册事件
    _registerColumnEvent(columnElem, index) {
        columnElem.addEventListener('click', (event) => {
            if (event.target.nodeName === 'LI') {
                let liElems = columnElem.querySelectorAll('li')
                this._renderUi(liElems, event.target)
                let targetIndex = event.target.getAttribute('index')
                this._target[index] = this._list[index][targetIndex]
                this._target.splice(index + 1, this._target.length - index - 1)
                this._handleOneColumn(index + 1)
            }
        })
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
