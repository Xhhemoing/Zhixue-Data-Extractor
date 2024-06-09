// ==UserScript==
// @name         Zhixue Data Extractor
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  从zhixue.com提取数据并打印主观和客观答案
// @author       for
// @contributor  灯火阑珊
// @match        https://www.zhixue.com/activitystudy/web-report/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建用于显示数据的新div
    function createOutputDiv() {
        let outputDiv = document.createElement('div');
        outputDiv.id = 'outputDiv';
        outputDiv.style.position = 'fixed';
        outputDiv.style.top = '0'; // 初始位置设为右上角
        outputDiv.style.right = '0'; // 初始位置设为右上角
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
        titleBar.textContent = '拖动此处移动';

        // 创建关闭按钮
        let closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.float = 'right';
        closeButton.style.marginRight = '10px';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(outputDiv);
        });
        titleBar.appendChild(closeButton);

        outputDiv.appendChild(titleBar);

        // 添加内容区
        let contentDiv = document.createElement('div');
        contentDiv.style.padding = '10px';
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

    // 向输出div添加消息的函数
    function appendMessage(message) {
        let outputDiv = document.getElementById('outputDiv');
        let contentDiv;
        if (!outputDiv) {
            contentDiv = createOutputDiv();
        } else {
            contentDiv = outputDiv.querySelector('div:last-child');
        }
        let messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        contentDiv.appendChild(messageDiv);
    }

    // 处理表单数据的函数
    function processSheetData(sheetData) {
        let outputDiv = document.getElementById('outputDiv');
        if (outputDiv) {outputDiv.querySelector('div:last-child').innerHTML = '';}

        let answerSubjects = [];  // 客观答题情况
        let answerObjects = [];   // 主观答题情况
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

    // 安全解析JSON的函数，带有自定义替换
    function safeParseJSON(jsonString) {
        // 替换 \" 为 " 和 \\ 为 \
        jsonString = jsonString.replace(/\\\\/g, '\\').replace(/\\\\/g, '\\');
        jsonString = jsonString.replace(/\\\\/g, '\\');
        console.log(jsonString);
        return JSON.parse(jsonString);
    }

    // 检查当前URL并在不匹配时关闭输出div
    function checkURL() {
        if (!window.location.href.startsWith('https://www.zhixue.com/activitystudy/web-report/index.html?from=web-container_top#/zxb-report/original-roll-detail/')) {
            let outputDiv = document.getElementById('outputDiv');
            if (outputDiv) {
                document.body.removeChild(outputDiv);
            }
        }
    }

    // 初始运行URL检查并设置间隔以保持检查
    checkURL();
    setInterval(checkURL, 3000);

    // 拦截并监控XHR请求以查找所需数据
    (function(open) {
        XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
            this.addEventListener('load', function() {
                if (url.includes('checksheet')) {  // 根据实际请求URL模式调整此条件
                    try {
                        let data = JSON.parse(this.responseText);
                        if (data.result && data.result.sheetDatas) {
                            let sheetData = safeParseJSON(data.result.sheetDatas);
                            processSheetData(sheetData);
                        }
                    } catch (e) {
                        appendMessage('解析响应数据时出错: ' + e);
                    }
                }
            }, false);
            open.call(this, method, url, async, user, pass);
        };
    })(XMLHttpRequest.prototype.open);

})();
