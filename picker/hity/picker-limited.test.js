import Picker from '../src/libs/picker-limited'
import { expect } from 'chai'

const pickerObj = new Picker()

describe('expect',function(){
    // 格式化日期
    it('compile',function(){
        expect(pickerObj._compile('<li data-id={{id}}>{{value}}</li>', [{
            id: 1,
            value: 'test1'
        }, {
            id: 12,
            value: 'test2'
        }, {
            id: 123,
            value: 'test3'
        }])).to.be.equal('<li data-id=1>test1</li><li data-id=12>test2</li><li data-id=123>test3</li>');
    });
    it('handleWholePanel',function(){
        expect(pickerObj._handleWholePanel.call({
            _touchIndex: -1,
            isCascade: true,
            _latestSequenceNum: 1,
            _handleOnePanel: () => true
        }, 0)).be.ok;
    });

    it('handleWholePanel-touch-invalid-lg',function(){
        expect(pickerObj._handleWholePanel.call({
            _touchIndex: 0,
            isCascade: true,
            _latestSequenceNum: 1,
            _handleOnePanel: () => true
        }, 2)).be.not.ok;
    });

    it('handleWholePanel-touch-equal',function(){
        expect(pickerObj._handleWholePanel.call({
            _touchIndex: 2,
            isCascade: false,
            _latestSequenceNum: 1,
            _handleOnePanel: () => true
        }, 2)).be.ok;
    });
});
