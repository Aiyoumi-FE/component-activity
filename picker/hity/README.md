## 功能特点
#### pick-limited
*   a、受UI控制，实现有限级的数据展现；
*   b、请求数据缓存，加速数据返回；
*   c、增加数据请求的时序控制；
*   d、交互touchmove的有效性控制；
*   e、限頻：UI更新50ms/touchmove，数据更新500ms/touchmove; touchend时，立即开启数据请求及UI更新；
*   f、支持级联；
*   g、支持列表单列dom自定义；
*   h、使用getComputedStyle获取行高，保留了小数点更为精确
  
#### pick-limitless
*   a、可实现无限级数据的展现；
*   b、请求数据缓存，加速数据返回；
*   c、增加数据请求的时序控制；
*   d、支持列表单列dom自定义；

## 调用方法

``` javascript
import Picker from 'src/libs/picker-limited'
import Picker2 from 'src/libs/picker-limitless'

//可将Picker改成Picker2
new Picker({
    // 默认值
    defaultTarget: [
        {value: 'test1', id: 1},
        {value: 'test2', id: 2},
        {value: 'test3', id: 3},
        {value: 'test4', id: 4}
    ],
    // 结束回调
    done: (info) => {
        console.log('info', info)
    },

    // 数据接口函数 返回promise
    getList: (target = [], index = 0) => {
        return new Promise((resolve, reject) => {
            let rst = {
                list: [],
                isDone: false,
                success: true
            }

            if (index === 4) {
                rst.isDone = true
                resolve(rst)
                return
            }

            rst.list = [{
                value: 'test1',
                id: 1
            }, {
                value: 'test2',
                id: 2
            }, {
                value: 'test3',
                id: 3
            }, {
                value: 'test4',
                id: 4
            }]
            resolve(rst)
        })
    }
}).init()
```

## 展现
#### picker-limited
![](https://images2018.cnblogs.com/blog/1094893/201804/1094893-20180424172259161-279081173.png)

#### picker-limitless
![](https://images2018.cnblogs.com/blog/1094893/201804/1094893-20180424172344122-64509523.png)

## picker-limited流程图
![](https://images2018.cnblogs.com/blog/1094893/201804/1094893-20180424172437137-304505056.png)
