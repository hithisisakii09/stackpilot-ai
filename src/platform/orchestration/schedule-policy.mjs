import {fields,integer} from '../contracts/validation.mjs';

export const maximumClockMs=4102444800000;
export function parseWindow(value){
 fields(value,['fromMs','toMs']);
 const fromMs=integer(value.fromMs,0,maximumClockMs);
 const toMs=integer(value.toMs,1,maximumClockMs);
 if(toMs<=fromMs||toMs-fromMs>300000)throw new Error('Invalid due window');
 return Object.freeze({fromMs,toMs});
}
export function parseSchedule(value){
 fields(value,['anchorMs','cadenceMs']);
 return Object.freeze({anchorMs:integer(value.anchorMs,0,maximumClockMs),cadenceMs:integer(value.cadenceMs,60000,86400000)});
}
export function evaluateDueWindow(value,window,nextDueMs){
 const spec=parseSchedule(value);
 const {fromMs,toMs}=parseWindow(window);
 integer(nextDueMs,0,maximumClockMs);
 if(toMs<=spec.anchorMs)return null;
 const dueMs=spec.anchorMs+Math.floor((toMs-1-spec.anchorMs)/spec.cadenceMs)*spec.cadenceMs;
 return dueMs>=fromMs&&dueMs>=nextDueMs?dueMs:null;
}
