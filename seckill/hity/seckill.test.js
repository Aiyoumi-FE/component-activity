import Seckill from './seckill'
import { expect } from 'chai'

const seckillObj = new Seckill()
const Util = {
    _formatDate: seckillObj._formatDate,
    _currServerTime: seckillObj._currServerTime
}

const template = [
    '$isBefore{<span>即将开始</span>}',
    '$isIng{<span>进行中</span>}',
    '$isAfter{<span>已结束</span>}',
    '$isIng||$isBefore{<div>',
    '   <span class="time-block">$W</span>',
    '   <span class="time-block">周</span>',
    '   ,',
    '   <span class="time-block">$D</span>',
    '   <span class="time-block">$D</span>',
    '     ',
    '   <span class="time-block">$h</span>',
    '   <span class="time-block">$h</span>',
    '   :',
    '   <span class="time-block">$m</span>',
    '   <span class="time-block">$m</span>',
    '   :',
    '   <span class="time-block">$s</span>',
    '   <span class="time-block">$s</span>',
    '   :',
    '   <span class="time-block">$_100ms</span>',
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

const nowTime = new Date().getTime()

describe('expect',function(){
    // 格式化日期
    it('formatDate_data',function(){
        expect(seckillObj._formatDate(123)).to.be.equal(123);
    });
    it('formatDate_string',function(){
        expect(seckillObj._formatDate('2018-12-1')).to.be.equal(1543593600000);
    });
    it('formatDate_other',function(){
        expect(seckillObj._formatDate({})).to.be.equal(0);
    });

    // 检测和格式化数据
    it('checkAFormatData_required',function(){
        expect(seckillObj._checkAFormatData.apply(Object.assign({
            getServerTime: function() {},
            startTime: '2018-11-12 12:12:12',
            endTime: '2018-11-13 12:12:12',
        }, Util))).to.be.ok;
    });
    it('checkAFormatData_date_error',function(){
        expect(seckillObj._checkAFormatData.apply(Object.assign({
            getServerTime: function() {},
            startTime: '2018-11-12 12:12:12',
            endTime: '2018-11-11 12:12:12'
        }, Util))).to.not.be.ok;
    });
    it('checkAFormatData_gap_error',function(){
        expect(seckillObj._checkAFormatData.apply(Object.assign({
            startTime: '2018-11-12 12:12:12',
            endTime: '2018-11-13 12:12:12',
            _formatDate: seckillObj._formatDate
        }, Util))).to.not.be.ok;
    });

    // 秒杀的三个状态
    it('state_isBefore',function(){
        expect(seckillObj._isBefore.apply(Object.assign({
            gap: 100,
            startTime: nowTime + 1000
        }, Util))).to.be.ok;
    });

    it('state_isIng',function(){
        expect(seckillObj._isIng.apply(Object.assign({
            gap: 100,
            startTime: nowTime - 1000,
            endTime: nowTime + 1000
        }, Util))).to.be.ok;
    });

    it('state_isAfter',function(){
        expect(seckillObj._isAfter.apply(Object.assign({
            gap: 100,
            endTime: nowTime - 1000
        }, Util))).to.be.ok;
    });

    // 客户端时间是否有效
    it('isValidClientTime_serverTime_valid',function(){
        expect(seckillObj._isValidClientTime.apply(Object.assign({
            _isGetServerTimeValid: true,
            _preClientTime: nowTime - 100,
            threshold: 10 * 1000
        }, Util))).to.be.ok;
    });

    it('isValidClientTime_serverTime_valid_outofthreshold',function(){
        expect(seckillObj._isValidClientTime.apply(Object.assign({
            _isGetServerTimeValid: true,
            _preClientTime: nowTime - 100000000,
            threshold: 10 * 1000
        }, Util))).to.be.not.ok;
    });

    it('isValidClientTime_serverTime_faild',function(){
        expect(seckillObj._isValidClientTime.apply(Object.assign({
            _isGetServerTimeValid: false,
            _preClientTime: nowTime - 100000000,
            threshold: 10 * 1000
        }, Util))).to.be.ok;
    });

    // 提取模版包含的时间参数
    it('computeRestOptions',function(){
        expect(seckillObj._computeRestOptions(timeOptions, template)).to.deep.equal([{
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
        }])
    });

    // 根据时间参数，计算出对应的时间值
    it('computeTime',function(){
        expect(seckillObj._computeTime([{
            name: 'month',
            key: 'M',
            mult: 30
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
        }], 1 * 1000 * 60 * 60 * 24 * 31 +
            1 * 1000 * 60 * 60 * 4 +
            1 * 1000 * 60 * 5 +
            1 * 1000 * 10 +
            1 * 876)).to.deep.equal({
            month: 1,
            hour: 28,
            minute: 5,
            second: 10,
            _100ms: 8
        })
    });

    // 编译模版显示隐藏逻辑
    it('compileDisplay',function(){
        expect(seckillObj._compileDisplay.call({
            _isIng: () => true,
            _isAfter: () => false,
            _isBefore: () => false
        }, '$isIng{<span>即将开始</span>}')).to.be.equal('<span>即将开始</span>')

        expect(seckillObj._compileDisplay.call({
            _isIng: () => false,
            _isAfter: () => false,
            _isBefore: () => false
        }, '$isIng{<span>即将开始</span>}')).to.be.equal('')

        expect(seckillObj._compileDisplay.call({
            _isIng: () => false,
            _isAfter: () => true,
            _isBefore: () => false
        }, '$isIng||$isAfter||$isBefore{<span>即将开始</span>}')).to.be.equal('<span>即将开始</span>')
    });

    // 模板时间值替换
    it('compileTime',function(){
        expect(seckillObj._compileTime('$W$W week，$D$D day $h$h:$m$m:$s$s', {
            week: 1,
            day: 1,
            hour: 4,
            minute: 5,
            second: 10,
            _100ms: 8
        }, [{
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
        }])).to.be.equal('01 week，01 day 04:05:10')
    });

});
