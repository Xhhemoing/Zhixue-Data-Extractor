// ==UserScript==
// @name         Zhixue Data Extractor
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Extract data from zhixue.com and print subjective and objective answers
// @author       for
// @match        https://www.zhixue.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to create a new div for displaying data
    function createOutputDiv() {
        let outputDiv = document.createElement('div');
        outputDiv.id = 'outputDiv';
        outputDiv.style.position = 'fixed';
        outputDiv.style.bottom = '0';
        outputDiv.style.left = '0'; // 初始位置设为左下角
        outputDiv.style.width = '300px'; // 初始宽度
        outputDiv.style.height = '200px'; // 初始高度
        outputDiv.style.backgroundColor = 'white';
        outputDiv.style.border = '1px solid black';
        outputDiv.style.resize = 'both'; // 允许调整大小
        outputDiv.style.overflow = 'auto'; // 内容可滚动
        outputDiv.style.zIndex = '9999';

        // 创建标题栏用于拖动
        let titleBar = document.createElement('div');
        titleBar.style.backgroundColor = '#ccc';
        titleBar.style.padding = '5px';
        titleBar.style.cursor = 'move';
        titleBar.textContent = 'Drag here to move';
        outputDiv.appendChild(titleBar);

        // 添加内容区
        let contentDiv = document.createElement('div');
        contentDiv.style.padding = '10px';
        contentDiv.id = 'contentDiv';
        outputDiv.appendChild(contentDiv);

        document.body.appendChild(outputDiv);

        // 添加拖动功能
        titleBar.addEventListener('mousedown', function(e) {
            let isDown = true;
            let offsetX = e.clientX - outputDiv.offsetLeft;
            let offsetY = e.clientY - outputDiv.offsetTop;

            function mouseMoveHandler(e) {
                if (isDown) {
                    outputDiv.style.left = `${e.clientX - offsetX}px`;
                    outputDiv.style.top = `${e.clientY - offsetY}px`;
                }
            }

            function mouseUpHandler() {
                isDown = false;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });

        return contentDiv; // 返回内容区供消息添加
    }

    // Function to append a message to the content div
    function appendMessage(message) {
        let contentDiv = document.getElementById('contentDiv');
        if (!contentDiv) {
            contentDiv = createOutputDiv();
        }
        let messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        contentDiv.appendChild(messageDiv);
    }

    // Function to process the sheet data
    function processSheetData(sheetData) {
        // 清空输出框内容
        let outputDiv = document.getElementById('outputDiv');
        if (outputDiv) {
            let contentDiv = document.getElementById('contentDiv');
            if (contentDiv) {
                contentDiv.innerHTML = '';
            }
        } else {
            createOutputDiv();
        }

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

        appendMessage(sheetData.answerSheetLocationDTO.paperName);
        appendMessage('客观题:');
        for (let answerSubject of answerSubjects) {
            appendMessage(`  ${answerSubject.dispTitle}. 得分:${answerSubject.score}/${answerSubject.standardScore}，你选择了：${answerSubject.answer}`);
        }
        appendMessage('主观题:');
        for (let answerObject of answerObjects) {
            appendMessage(`  ${answerObject.dispTitle}. 得分:${answerObject.score}/${answerObject.standardScore}`);
            if (answerObject.subTopics.length > 1) {
                for (let answerSubTopic of answerObject.subTopics) {
                    appendMessage(`    (${answerSubTopic.subTopicIndex}).得分:${answerSubTopic.score}，阅卷人:${answerSubTopic.teacherMarkingRecords[0].teacherName}，阅卷时间：${new Date(answerSubTopic.teacherMarkingRecords[0].markingTime).toLocaleString()}`);
                }
            } else {
                appendMessage(`    阅卷人:${answerObject.subTopics[0].teacherMarkingRecords[0].teacherName}，阅卷时间：${new Date(answerObject.subTopics[0].teacherMarkingRecords[0].markingTime).toLocaleString()}`);
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
                        appendMessage('Error parsing response data: ' + e);
                    }
                }
            }, false);
            open.call(this, method, url, async, user, pass);
        };
    })(XMLHttpRequest.prototype.open);

})();
