// ==UserScript==
// @name         NGA书签
// @author       朝苍琴月
// @version      1.0.2
// @description  存储NGA的tid和楼层
// @license      MIT
// @timestamp    1767607860
// @homepageURL  https://github.com/sealdice/javascript
// ==/UserScript==

(() => {
    const STORAGE_KEY = "NGA_shuqian";//存储用的key，没有特殊需求不必改

    /**
   * NGA需要登录才能查看大部分信息，所以需要你填写登录后的Cookie值
   * 获取步骤（网上搜索“浏览器获取Cookie”，有图更清晰）：
   * 1.在浏览器登录NGA后，保持在NGA网页，F12键打开开发者工具，在标签页找到Network
   * 2.刷新网页观察Network选项卡的变化，在filter那一行找到Doc筛选器，筛选得到当前网页的请求响应行
   * 3.在上述行的右栏的Headers选项卡中，找到Request Headers下的Cookie，它很长的，应该不会找不到
   * 4.将其复制粘贴到下面这个COOKIE常量的初始值内
  */
    const COOKIE = "  ";

    // src/index.ts
    const PARA = {
        "headers": {
            "accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
            "Cookie": COOKIE
        }
    };
    const DOMAIN_NAME = "ngabbs.com";//nga的域名，要是某个域名崩了，你可以在这里换其他的域名
    const HELP = `<尖括号内为必填参数，写的时候不带尖括号>
[方括号内为选填参数，写的时候不带方括号]
# 后面为注释，解释命令的作用

.书签 记录 <楼层> [tid]
# 记录NGA帖子的tid和您的楼层，如果不填tid将默认修改收藏中的第一个。
# 注意楼层在前，tid在后，写反会导致记录错误。

.书签 我的
# 查看您所有的NGA书签。

.书签 清除 [tid]
# 将记录的帖子删除，不填tid将删除所有书签。
`;
    function formatTimestamp(timestamp) {
        // 将10位时间戳转换为YMD时间戳
        const date = new Date(timestamp * 1000);
        Y = date.getFullYear() + '-';
        M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
        D = date.getDate() + ' ';
        return Y + M + D;
    }
    function main() {
        let ext = seal.ext.find("nga_shuqian");
        if (!ext) {
            ext = seal.ext.new("nga_shuqian", "朝苍琴月", "1.0.0");
            seal.ext.register(ext);
        }
        const cmdSeal = seal.ext.newCmdItemInfo();
        cmdSeal.name = "书签";
        cmdSeal.help = HELP;
        cmdSeal.solve = (ctx, msg, cmdArgs) => {
            try {
                let subCmd = cmdArgs.getArgN(1);
                switch (subCmd) {
                    case "log":
                    case "记录": {
                        const qq = msg.sender.userId;
                        const qname = msg.sender.nickname;
                        let reply = ``;
                        const lou = Number(cmdArgs.getArgN(2));
                        const tid = cmdArgs.getArgN(3);
                        let data = JSON.parse(ext.storageGet(STORAGE_KEY) || "{}");

                        if (Object.keys(data).length === 0) {
                            data = {
                                check : {},
                                user:{}
                            };//如果不存在记录存档，就新建一个数组
                            
                        }
                        if (!(qq in data.user)) {
                            data.user[qq] = [];
                            data.check[qq] = {clear:false,time:""};
                            //如果不存在该QQ号的存档，就新建一个
                            //在data中建立一个对应qq的布尔值和时间戳用于确认清除书签
                        }

                        //重置清除记录
                        data.check[qq].clear = false;
                        data.check[qq].time = "";
                        
                        
                        //正式执行
                        if (!lou) {//如果楼层数是falsy的，弹出帮助信息
                            const ret = seal.ext.newCmdExecuteResult(true);
                            ret.showHelp = true;
                            return ret;
                        } else {
                            //console.log("开始");
                            if (tid !== null && (isNaN(Number(tid)) || Number(tid) == 0)) {//如果tid是NaN或者0或者空字符串，返回tid错误
                                //console.log("tid不为空，但得到了NaN或0。");
                                reply = `接收到了错误的tid，请重新输入再试。`;
                                ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                seal.replyToSender(ctx, msg, reply);
                                return seal.ext.newCmdExecuteResult(true);
                            } else if (tid == null) {//tid没填
                                //console.log("tid为空");
                                if(!data.user[qq][0]){
                                    reply = `您似乎还没有记录过书签。`;
                                    ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                    seal.replyToSender(ctx, msg, reply);
                                    return seal.ext.newCmdExecuteResult(true);
                                }
                                tid = data.user[qq][0];//取索引0为的记录为tid
                                const url = `https://${DOMAIN_NAME}/read.php?tid=${tid}`;
                                const queryUrl = `${url}&__output=11`;//帖子API
                                //尝试连接帖子
                                //console.log("尝试连接帖子");
                                fetch(queryUrl, PARA).then((response) => {
                                    try {
                                        if (!response.ok) {
                                            seal.replyToSender(ctx, msg, `无法访问该tid的帖子，响应状态码为：${response.status}`);
                                            return seal.ext.newCmdExecuteResult(false);
                                        }
                                        response.json().then((urldata) => {
                                            urldata = urldata["data"];//接收帖子数据
                                            let foundlou = Number(urldata["__ROWS"]);//检查楼层数据
                                            if (lou > foundlou) {
                                                reply = `您输入的楼层数大于在tid为<` + tid.toString() + `>的帖子中查询到的总楼层数。\n请检查后重新添加书签。`;
                                            } else {
                                                data.user[qq][0][1] = lou;
                                                data.user[qq][0][2] = urldata["__T"]["subject"];
                                                reply = `已将<` + qname + `>收藏中tid为<` + tid.toString() + `>的帖子书签楼层更新为<` + lou.toString() + `>。\n可用<.书签 我的>查看所有书签。`;
                                            }
                                            ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                            seal.replyToSender(ctx, msg, reply);
                                            return seal.ext.newCmdExecuteResult(true);
                                        });
                                    } catch (error) {
                                        seal.replyToSender(ctx, msg, error.message);
                                        return seal.ext.newCmdExecuteResult(false);
                                    }
                                });
                            } else {
                                //console.log("已收到正确的lou和tid");
                                let index = data.user[qq].length;//索引默认是data.user[qq]的长度，即数组的下一个索引
                                for (let i = 0; i < data.user[qq].length; i++) {
                                    if (data.user[qq][i][0] == tid && data.user[qq][i][1] == lou) {//如果tid和lou在记录中已记录，就直接返回已记录，不再查询
                                        reply = `在记录中对tid为<` + tid.toString() + `>的帖子书签已经是<` + lou.toString() + `>楼了。\n可用<.书签 我的>查看所有书签。`;
                                        ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                        seal.replyToSender(ctx, msg, reply);
                                        return seal.ext.newCmdExecuteResult(true);
                                    } else if (data.user[qq][i][0] == tid && data.user[qq][i][1] !== lou) {//如果tid有记录，但记录的楼层不一致，就把索引输出，用于后续处理
                                        index = i;
                                    }
                                }
                                //处理索引没有更新的情况，即tid没有记录的情况
                                if (data.user[qq][index] === void 0) {
                                    data.user[qq][index] = [];//tid没有记录的情况下，新建。
                                }

                                const url = `https://${DOMAIN_NAME}/read.php?tid=${tid}`;
                                const queryUrl = `${url}&__output=11`;//帖子API
                                //尝试连接tid的帖子
                                //console.log("尝试连接帖子");
                                fetch(queryUrl, PARA).then((response) => {
                                    try {
                                        if (!response.ok) {
                                            seal.replyToSender(ctx, msg, `无法访问该tid的帖子，响应状态码为：${response.status}`);
                                            return seal.ext.newCmdExecuteResult(false);
                                        }
                                        response.json().then((urldata) => {
                                            urldata = urldata["data"];//接收帖子数据
                                            //console.log("已接收到帖子数据");
                                            let title = urldata["__T"]["subject"];
                                            let foundlou = Number(urldata["__ROWS"]);

                                            if (lou > foundlou) {
                                                reply = `您输入的楼层数大于在tid为<` + tid.toString() + `>的帖子中查询到的总楼层数。\n请检查后重新添加书签。`
                                            } else {
                                                //这里的index为书签索引，如果是已有的tid，则在上面更新过；如果是新tid则已经新建过
                                                data.user[qq][index][0] = tid;
                                                data.user[qq][index][1] = lou;
                                                data.user[qq][index][2] = urldata["__T"]["subject"];
                                                reply = `已为<` + qname + `>将tid为<` + data.user[qq][0][0].toString() + `>的帖子添加书签，楼层为<` + lou.toString() + `>，标题为<`+ data.user[qq][index][2] +`>。\n可用<.书签 我的>查看所有书签。`;
                                            }
                                            //console.log("正在存储");
                                            ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                            seal.replyToSender(ctx, msg, reply);
                                            return seal.ext.newCmdExecuteResult(true);
                                        });
                                    } catch (error) {
                                        seal.replyToSender(ctx, msg, error.message);
                                        return seal.ext.newCmdExecuteResult(false);
                                    }
                                });
                            }
                        }
                        seal.replyToSender(ctx, msg, reply);
                        return seal.ext.newCmdExecuteResult(false);
                    }
                    case "清除":
                        {
                            let data = JSON.parse(ext.storageGet(STORAGE_KEY) || "{}");
                            const qq = msg.sender.userId;
                            const qname = msg.sender.nickname;
                            let reply = ``;
                            let todaytime = msg.time;
                            const tid = cmdArgs.getArgN(2);
                            if (Object.keys(data).length === 0) {
                            data = {
                                check : {},
                                user:{}
                                };//如果不存在记录存档，就新建一个数组
                            
                            }
                            if (!(qq in data.user)) {
                                data.user[qq] = [];
                                data.check[qq] = {clear:false,time:""};
                                //如果不存在该QQ号的存档，就新建一个
                                //在data中建立一个对应qq的布尔值和时间戳用于确认清除书签
                            }

                            if (tid == "" || tid==null) {
                                if (data.check[qq].clear == false) {
                                    data.check[qq].clear = true;
                                    data.check[qq].time = formatTimestamp(todaytime);
                                    reply = `您正在将您的书签全部删除，清除后将无法找回。\n请在今日内再次输入[.书签 清除]进行清除确认。`
                                } else if (data.check[qq].clear == true) {
                                    if (data.check[qq].time == formatTimestamp(todaytime)) {
                                        data.user[qq] = [];
                                        reply = `已将<` + qname + `>的书签清除。\n`;
                                        data.check[qq].clear = false;
                                        data.check[qq].time == "";
                                    } else if (data.check[qq].time !== formatTimestamp(todaytime)) {
                                        data.check[qq].clear = false;
                                        data.check[qq].time == "";
                                        reply = `重置确认超时，请重新确认。\n`;
                                    }
                                }
                            } else {
                                let index = NaN;
                                for (let i = 0; i < data.user[qq].length; i++) {
                                    if (data.user[qq][i][0] == tid) {//查找tid为要删除的tid的索引
                                        data.user[qq].splice(i, 1);
                                        index = i;
                                        reply = `已经把记录中tid为<` + tid + `>的帖子书签删除。\n可用<.书签 我的>查看所有书签。`;
                                        break;
                                    } 
                                }
                                if (isNaN(index)) {
                                    reply = `没有在记录中找到tid为<` + tid + `>的帖子书签`;
                                }
                            }

                            ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                            seal.replyToSender(ctx, msg, reply);
                            return seal.ext.newCmdExecuteResult(true);

                        }
                    case "我的":
                        {
                            let data = JSON.parse(ext.storageGet(STORAGE_KEY) || "{}");
                            const qq = msg.sender.userId;
                            const qname = msg.sender.nickname;

                            if (Object.keys(data).length === 0) {
                            data = {
                                check : {},
                                user:{}
                                };//如果不存在记录存档，就新建一个数组
                            
                            }
                            if (!(qq in data.user)) {
                                data.user[qq] = [];
                                data.check[qq] = {clear:false,time:""};
                                //如果不存在该QQ号的存档，就新建一个
                                //在data中建立一个对应qq的布尔值和时间戳用于确认清除书签
                            }

                            //重置清除记录
                        
                            data.check[qq].clear = false;
                            data.check[qq].time = "";

                            let reply = ``;
                            if (data.user[qq].length == 0) {
                                reply = `您还没有记录的书签。可使用[.书签 记录 <楼层> [tid]]添加书签。`
                                ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                                seal.replyToSender(ctx, msg, reply);
                                return seal.ext.newCmdExecuteResult(true);
                            }
                            reply = `<` + qname + `>在记录的书签如下：\n`;
                            for (let i = 0; i < data.user[qq].length; i++) {
                                reply += `[` + (i + 1).toString() + `]`;
                                reply += data.user[qq][i][2] + ` : `;
                                let page = Math.ceil(data.user[qq][i][1] / 20);
                                const url = `https://${DOMAIN_NAME}/read.php?tid=${data.user[qq][i][0]}&page=${page}#${data.user[qq][i][1]}`;
                                reply += url + `\n`;
                            }
                            ext.storageSet(STORAGE_KEY, JSON.stringify(data));
                            seal.replyToSender(ctx, msg, reply);
                            return seal.ext.newCmdExecuteResult(true);
                        }

                    case "帮助":
                    case "help":
                    default:
                        {
                            let data = JSON.parse(ext.storageGet(STORAGE_KEY) || "{}");
                            const qq = msg.sender.userId;
                            if (Object.keys(data).length === 0) {
                                data = {
                                    check : {},
                                    user:{}
                                };//如果不存在记录存档，就新建一个数组

                            }
                            if (!(qq in data.user)) {
                                data.user[qq] = [];
                                data.check[qq] = {clear:false,time:""};

                            }

                            //重置清除记录
                        
                            data.check[qq].clear = false;
                            data.check[qq].time = "";
                            ext.storageSet(STORAGE_KEY, JSON.stringify(data));

                            const ret = seal.ext.newCmdExecuteResult(true);
                            ret.showHelp = true;
                            return ret;
                        }
                }
            } catch (error) {
                seal.replyToSender(ctx, msg, error.message);
                return seal.ext.newCmdExecuteResult(false);
            }
        };
        ext.cmdMap["书签"] = cmdSeal;
    }
    main();
})();
