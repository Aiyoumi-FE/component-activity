/* 楼层组件
    功能：根据给定的模版，编译生成list Dom结构；
        使用translate方法，进行滚动，包括nav滚动、list滚动；
        增加局部样式生成机制，防止样式污染；
        可在模版中定义style，确定prolist的布局；或者使用cb回调，动态修改布局。
    参数：
        style: 样式，会提供默认样式；
        template:list模版，其中的{{xxx}}可被输入floorData属性替换；如{{src}}->floorData.proList[key].src，"key"为nav中对应的key值；
        el: 挂载点（默认为body）;
        pClass: 自定义组件容器的类;
        cb: 回调函数；在组件mounted以后，定位之前调用。（修改list中的布局）
    遗留：可抽取滚动组件。
*************************/
const hashIdName = '#floor-' + new Date().getTime()
const defaultStyle = [
    hashIdName + ' {position: fixed; top:0; left:0; width:100%; height:100%;}',
    hashIdName + ' #nav {z-index: 2; position: relative; top:0; left: 0; background: #fff; width: 100%; height: 30px; line-height: 30px;}',
    hashIdName + ' #nav-list-frame{padding: 0 5px; width: 86%; overflow:hidden;}',
    hashIdName + ' #nav-list{display: flex; transition: transform .5s;}',
    hashIdName + ' #nav li {padding: 0 5px;}',
    hashIdName + ' #nav li.active {background: black; color: #fff;}',
    hashIdName + ' #nav span {position: absolute; right: 0; top: 0;}',
    hashIdName + ' #panel {position:absolute; top: 0; left: 0; width: 100%; z-index: 2;}',
    hashIdName + ' #panel p {border-bottom: 1px solid #efefef; height: 30px; line-height: 30px; background-color: #fff;}',
    hashIdName + ' #panel p span{float: right; }',
    hashIdName + ' #panel ul {display: flex; flex-wrap: wrap; line-height: 30px; background-color: rgba(255, 255, 255, 0.6)}',
    hashIdName + ' #panel li {padding: 0 5px; }',
    hashIdName + ' #panel li.active {background: black; color: #fff;}',
    hashIdName + ' #list {position:relative; background: #000; transition: transform 0.5s;}',
    hashIdName + ' #list section h1{background-color: black; color: #fff; font-size: 20px; font-weight: bold; text-align: center;}',
    hashIdName + ' .hide {display: none;}',
    hashIdName + ' .visible {visibility: visible;}',
    hashIdName + ' #list section img {width: 100px; height: 100px; margin-right: 10px;}',
    hashIdName + ' #list li {display: flex; border-bottom: 1px solid #fff; padding: 10px; background:#fff; margin: 10px;}'
].join('')
const defaultItemTemplate = [
    '<li>',
    '   <img src="{{src}}">',
    '   <div class="desc">',
    '       <p class="name">{{name}}</p>',
    '       <p class="price">{{price}}</p>',
    '       <span class="btn">{{btnTxt}}</span>',
    '   </div>',
    '</li>'
].join('')

class Floor {
    constructor(options) {
        Object.assign(this, {
            style: defaultStyle,
            itemTemplate: defaultItemTemplate,
            el: document.querySelector('body'),
            floorData: {}
        },
        options, {
            _pElem: null,
            _navListPos: [],
            _proListPos: [],
            _navRealWidth: 0,
            _activeKey: '',
            _translatePosNav: 0,
            _translatePosList: 0
        })
    }

    init() {
        // 验证输入
        // this._checkArguments()

        // style渲染
        this._renderStyle()

        this._compile()
        this.cb && this.cb()
        this._initPos()

        this._bindEvent()
    }

    _renderStyle() {
        let style = this.style
        if (typeof style === 'string' && style.trim()) {
            let styleElem = document.createElement('style')
            styleElem.innerHTML = style
            document.querySelector('head').append(styleElem)
        }
    }

    // 编译及挂载
    _compile() {
        let navStr = this._compileNav()
        let panelStr = this._compilePanel()
        let proStr = this._compileList()

        this._mount(navStr + panelStr + proStr)
    }

    // 编译导航
    _compileNav() {
        let navList = this.floorData.navList
        let navStr = '<div id="nav"><span class="down">下拉</span><div id="nav-list-frame"><div id="nav-list-wp"><ul id="nav-list">'
        navList.forEach(item => {
            navStr += '<li data-key="' + item.key + '">' + item.value + '</li>'
        })
        navStr += '</ul></div></div></div>'
        return navStr
    }

    // 编译面板
    _compilePanel() {
        let panelList = this.floorData.navList
        let panelStr = '<div id="panel" class="hide">'
        panelStr += '<p>选择楼层<span class="up">收起</span></p>'
        panelStr += '<ul>'
        panelList.forEach(item => {
            panelStr += '<li data-key="' + item.key + '">' + item.value + '</li>'
        })
        panelStr += '</div>'
        return panelStr
    }

    // 编译列表
    _compileList() {
        let navList = this.floorData.navList
        let proList = this.floorData.proList
        let proStr = '<div id="list">'
        // 正则匹配
        let reg = new RegExp(/(\{\{([^\}]+)\}\})/)
        // 根据导航找到panel对应的List
        navList && navList.forEach(item => {
            let sectionStr = '<section data-key="' + item.key + '"><h1>' + item.value + '</h1><ul>'
            proList[item.key] && proList[item.key].forEach(sectionInfo => {
                // 根据list找到对应的模块的信息
                let tTemplate = this.itemTemplate
                while (reg.test(tTemplate)) {
                    tTemplate = tTemplate.replace(RegExp.$1, sectionInfo[RegExp.$2])
                    if (!sectionInfo[RegExp.$2]) {
                        console.log('属性值缺失：', RegExp.$2)
                    }
                }
                sectionStr += tTemplate
            })
            sectionStr += '</ul></section>'
            proStr += sectionStr
        })
        proStr += '</div>'
        return proStr
    }

    //  挂载
    _mount(compileStr) {
        let pElem = this._pElem

        if (!pElem) {
            pElem = document.createElement('div')
            pElem.id = hashIdName.slice(1)
            pElem.className = (!this.pClass ? '' : this.pClass)
            pElem.innerHTML = compileStr
            this.el.appendChild(pElem)
            this._pElem = pElem
        } else {
            pElem.innerHTML = compileStr
        }
    }
    // 初始化位置元素: nav元素对应的可位移的宽度、section list元素对应的可滚动的高度
    _initPos() {
        let navPElem = this._pElem.querySelector('#nav')
        let panelPElem = this._pElem.querySelector('#panel')
        let listPElem = this._pElem.querySelector('#list')

        // 获取每个元素可位移的宽度translateX
        this._navListPos = this._getNavListPos(navPElem.querySelector('#nav-list-frame'))

        this._proListPos = this._getProListPos(listPElem)
    }
    _getWidthALeft(e) {
        return {
            key: e.getAttribute('data-key'),
            left: e.offsetLeft,
            width: e.offsetWidth
        }
    }
    _getTotalWidth(navListPosObj) {
        return navListPosObj.reduce((x, y) => {
            x = typeof x == 'object' ? x.width : x
            y = typeof y == 'object' ? y.width : y
            return x + y
        })
    }
    _getNavListPos(navListElem) {
        // 获取导航容器的定宽
        let navFrameWidth = navListElem.offsetWidth

        // 获取导航没个item 的宽和left位置，便于计算总宽及可位移的宽度
        let navListPosObj = Array.prototype.map.call(navListElem.querySelectorAll('#nav-list li'), e => this._getWidthALeft(e))

        // 获取真实导航内容的总宽
        let navRealWidth = this._getTotalWidth(navListPosObj)
        this._navRealWidth = navRealWidth

        // 获取可位移的位置
        return navListPosObj.map(obj => {
            let item = {
                key: obj.key
            }
            if (navRealWidth < navFrameWidth) {
                return Object.assign(item, {
                    value: 0
                })
            }

            let virtualMidPos = (navFrameWidth - obj.width) / 2

            if (obj.left < virtualMidPos) {
                return Object.assign(item, {
                    value: 0
                })
            } else if (obj.left > (navRealWidth - virtualMidPos - obj.width)) {
                return Object.assign(item, {
                    value: navFrameWidth - navRealWidth
                })
            } else {
                return Object.assign(item, {
                    value: virtualMidPos - obj.left
                })
            }
        })
    }
    // 获取proList每个section可scroll的高度
    _getProListPos(listPElem) {
        let proFrameHeight = window.outerHeight - this._pElem.querySelector('#nav').offsetHeight

        let proListPosObj = Array.prototype.map.call(listPElem.querySelectorAll('section'), e => {
            return {
                key: e.getAttribute('data-key'),
                top: e.offsetTop,
                height: e.offsetHeight
            }
        })

        let proRealHeight = proListPosObj.reduce((x, y) => {
            x = typeof x == 'object' ? x.height : x
            y = typeof y == 'object' ? y.height : y
            return x + y
        })

        // 获取可滚动的位置
        return proListPosObj.map(obj => {
            let item = {
                key: obj.key
            }
            if (proRealHeight < proFrameHeight) {
                return Object.assign(item, {
                    value: 0
                })
            }

            if (obj.top < (proRealHeight - proFrameHeight)) {
                return Object.assign(item, {
                    value: obj.top * -1
                })
            } else {
                return Object.assign(item, {
                    value: (proRealHeight - proFrameHeight) * -1
                })
            }
        })
    }
    _bindEvent() {
        let navPElem = this._pElem.querySelector('#nav')
        let panelPElem = this._pElem.querySelector('#panel')
        let listPElem = this._pElem.querySelector('#list')

        navPElem.querySelector('#nav-list-wp').addEventListener('click', this._navEvent.bind(this), false)
        navPElem.querySelector('.down').addEventListener('click', this._navEvent.bind(this), false)
        panelPElem.addEventListener('click', this._panelEvent.bind(this), false)

        this._touchScroll(listPElem, 'v', 2, -1 * (listPElem.clientHeight - window.outerHeight + 30), 0, (translatePos) => {
            let currFloor = (this._proListPos.filter(item => item.value > translatePos).reverse())[0]

            if (currFloor && currFloor.key != this._activeKey) {
                this._navChangeState(currFloor.key)
            }
        })
        this._touchScroll(navPElem.querySelector('#nav-list'), 'h', 2, -1 * (this._navRealWidth - navPElem.querySelector('#nav-list').clientWidth), 0)
    }

    _navChangeState(key) {
        // nav移除 active, 对应item上添加active
        this._removeAAddClassName('active', this._pElem.querySelector('#nav-list [data-key=' + key + ']'), '#nav-list li')

        // 位移
        this._translatePosNav = this._navListPos.filter(item => item.key === key)[0].value
        this._pElem.querySelector('#nav-list').style.transform = 'translate(' + this._translatePosNav + 'px, 0)'

        // panel移除active, 对应item上添加active
        this._removeAAddClassName('active', this._pElem.querySelector('#panel [data-key=' + key + ']'), '#panel li')
    }

    _navEvent(event) {
        event.preventDefault()
        event.stopPropagation()
        switch (event.target.nodeName) {
            case 'LI':
                let key = event.target.getAttribute('data-key')
                if (key) {
                    this._navChangeState(key)

                    this._translatePosList = this._proListPos.filter(item => item.key === key)[0].value
                    // prolist滚动到对应位置
                    this._pElem.querySelector('#list').style.transform = 'translate(0, ' + this._translatePosList + 'px)'
                    this._activeKey = key
                }
                break
            case 'SPAN':
                if (event.target.classList.contains('down')) {
                    this._pElem.querySelector('#nav').classList.add('visible')
                    this._pElem.querySelector('#panel').classList.remove('hide')
                }
                break
        }
    }

    _panelEvent(event) {
        switch (event.target.nodeName) {
            case 'LI':
                let key = event.target.getAttribute('data-key')
                if (key) {
                    this._pElem.querySelector('#nav [data-key=' + key + ']').click()
                }
                break
            case 'SPAN':
                if (event.target.classList.contains('up')) {
                    this._pElem.querySelector('#nav').classList.remove('visible')
                    this._pElem.querySelector('#panel').classList.add('hide')
                }
                break
        }
    }

    _touchScroll(touchElem, direct = 'v', ratio = 2, minLimit = 0, maxLimit = 0, callback) {
        let touchObj = {
            preTouch: 0,
            currTouch: 0,
            direct, // v纵向，h横向
            ratio,
            minLimit,
            maxLimit,
            gap: 0
        }
        let whichClient = direct === 'v' ? 'clientY' : 'clientX'

        touchElem.addEventListener('touchstart', (event) => {
            touchObj.preTouch = event.touches[0][whichClient]
        }, false)
        touchElem.addEventListener('touchmove', (event) => {
            touchObj.currTouch = event.touches[0][whichClient]
            this._renderTouchUI(touchElem, touchObj, callback)
        }, false)
        touchElem.addEventListener('touchend', (event) => {
            if (direct === 'v') {
                this._translatePosList += touchObj.gap
            } else {
                this._translatePosNav += touchObj.gap
            }
        }, false)
    }

    _renderTouchUI(touchElem, touchObj, callback) {
        console.log('touch', touchObj)
        let {
            currTouch,
            preTouch,
            maxLimit,
            minLimit,
            direct,
            ratio
        } = touchObj

        let translatePos = this._translatePosNav
        if (direct === 'v') {
            translatePos = this._translatePosList
        }
        let gap = (currTouch - preTouch) * ratio

        if (maxLimit > (translatePos + gap) && minLimit < (translatePos + gap)) {
            // gap = gap
        } else if (minLimit > translatePos + gap) {
            gap = minLimit - translatePos
        } else if (maxLimit < translatePos + gap) {
            gap = maxLimit - translatePos
        }

        if (direct === 'v') {
            touchElem.style.transform = 'translate(0, ' + (translatePos + gap) + 'px)'
        } else {
            touchElem.style.transform = 'translate(' + (translatePos + gap) + 'px, 0)'
        }
        touchObj.gap = gap
        let newTranslatePos = translatePos + gap
        callback && callback(newTranslatePos)
    }

    // 类名切换
    _removeAAddClassName(className, elem, elemQueryName) {
        // 移除兄弟当中的类名
        elem.parentNode.querySelectorAll(elemQueryName).forEach(e => e.classList.remove(className))
        // 对元素添加类名
        elem.classList.add(className)
    }
}

export default Floor
