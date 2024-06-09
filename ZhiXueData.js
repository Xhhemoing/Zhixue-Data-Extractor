// ==UserScript==
// @name         Zhixue Data Extractor
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Extract data from zhixue.com and print subjective and objective answers
// @author       You
// @match        https://www.zhixue.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to process the sheet data
    function processSheetData(sheetData) {
        let answerSubjects = [];  //客观答题情况
        let answerObjects = [];   //主观答题情况
        let studentAnswerList = sheetData.userAnswerRecordDTO.answerRecordDetails;

        for (let studentAnswer of studentAnswerList) {
            if (studentAnswer.answerType === 's01Text') {
                answerSubjects.push(studentAnswer);
            }
            if (studentAnswer.answerType === 's02Image') {
                answerObjects.push(studentAnswer);
            }
        }

        console.log(sheetData.answerSheetLocationDTO.paperName);
        console.log('客观题:');
        for (let answerSubject of answerSubjects) {
            console.log(`  ${answerSubject.dispTitle}. 得分:${answerSubject.score}/${answerSubject.standardScore}，你选择了：${answerSubject.answer}`);
        }
        console.log('主观题:');
        for (let answerObject of answerObjects) {
            console.log(`  ${answerObject.dispTitle}. 得分:${answerObject.score}/${answerObject.standardScore}`);
            if (answerObject.subTopics.length > 1) {
                for (let answerSubTopic of answerObject.subTopics) {
                    console.log(`    (${answerSubTopic.subTopicIndex}).得分:${answerSubTopic.score}，阅卷人:${answerSubTopic.teacherMarkingRecords[0].teacherName}，阅卷时间：${new Date(answerSubTopic.teacherMarkingRecords[0].markingTime).toLocaleString()}`);
                }
            } else {
                console.log(`    阅卷人:${answerObject.subTopics[0].teacherMarkingRecords[0].teacherName}，阅卷时间：${new Date(answerObject.subTopics[0].teacherMarkingRecords[0].markingTime).toLocaleString()}`);
            }
        }
    }

    // Function to safely parse JSON with custom replacements
    function safeParseJSON(jsonString) {
        // Replace \" with " and \\ with \
        jsonString = jsonString.replace(/\\\\/g, '\\').replace(/\\\\/g, '\\');
        jsonString = jsonString.replace(/\\\\/g, '\\');
        console.log(jsonString);
        return JSON.parse(jsonString);
    }

    // Intercept and monitor XHR requests to find the required data
    (function(open) {
        XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
            this.addEventListener('load', function() {
                if (url.includes('checksheet')) {  // Adjust this condition based on the actual request URL pattern
                    try {
                        let data = JSON.parse(this.responseText);
                        if (data.result && data.result.sheetDatas) {
                            let sheetData = safeParseJSON(data.result.sheetDatas);
                            processSheetData(sheetData);
                        }
                    } catch (e) {
                        console.error('Error parsing response data:', e);
                    }
                }
            }, false);
            open.call(this, method, url, async, user, pass);
        };
    })(XMLHttpRequest.prototype.open);

})();
