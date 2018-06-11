# floor
功能特性：

* a、自定义UI;
* b、使用translate方法，进行滚动，包括nav滚动、list滚动；
* c、增加局部样式生成机制，防止样式污染;
* d、可在模版中定义style，确定prolist的布局；或者使用cb回调，动态修改布局。

组件使用方法：

floorData中的key为必需值

```
import Floor from 'src/libs/floor'

const floorData = {
    navList: [{
        key: '_1',
        value: 'floor1'
    }, {
        key: '_12',
        value: 'floooooor2'
    }
    ...
    ],
    proList: {
        _1: [{
            src: 'https:....jpeg',
            name: 'test1-2',
            price: '12-2',
            btnTxt: 'test1-1'
        }],
        _12: [{
            src: 'https:....jpeg',
            name: 'test12',
            price: '12',
            btnTxt: 'test1-1'
        }, {
            src: 'https://....jpeg',
            name: 'test12-2',
            price: '12',
            btnTxt: 'test1-1'
        }]
        ...
    }
}

new Floor({
    floorData
}).init()

```