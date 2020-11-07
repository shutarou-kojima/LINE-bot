// CHANNEL_ACCESS_TOKENを設定
// LINE developerで登録をした、自分のCHANNEL_ACCESS_TOKENを入れて下さい
var CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("channel_access_token");
var line_endpoint = 'https://api.line.me/v2/bot/message/reply';

var spreadsheet_id = PropertiesService.getScriptProperties().getProperty("spreadsheet_id");
var spreadsheet = SpreadsheetApp.openById(spreadsheet_id);
var sheet = spreadsheet.getActiveSheet();


// ポストで送られてくるので、ポストデータ取得
// JSONをパースする
function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  var groupId = json.events[0].groupId;
  var roomId = json.events[0].roomId;
  
  //返信するためのトークン取得
  var reply_token= json.events[0].replyToken;
  if (typeof reply_token === 'undefined')return;

  // 送られたLINEメッセージを取得
  var user_message = json.events[0].message.text;  
  
  // 返信する内容を作成
  var reply_text = '';
  // オリジナルダイスの情報を読み込み
  // getRange(1, 1)でA1を意味する。(0, 0)は無効
  var original_dice_cell = sheet.getRange(1, 1);
  var original_dice = JSON.parse(original_dice_cell.getValue());
    
  // オリジナルダイスの登録と削除の場合
  if (/^[^=,]+=[^=]+$/.test(user_message)) {
    // =でsplit
    user_message = user_message.split( '=' );
    var register = {title: user_message[0], request: user_message[1]};
    if(register.request === 'delete' && typeof original_dice[register.title] !== 'undefined'){
    // 削除
      delete original_dice[register.title];
      original_dice_cell.setValue(JSON.stringify(original_dice));
      reply_text = 'オリジナルダイス[' + register.title + 'を削除しました。';
    } else if(-1 !== register.request.indexOf(',')) {
    // 登録（上書き）
      original_dice[register.title] = register.request; 
      original_dice_cell.setValue(JSON.stringify(original_dice));
      reply_text = register.title + ' に、オリジナルダイス[' + register.request + ']を登録しました。\n[num]d' + register.title + '\nと発言することで、このダイスが振れます。';
    }
  // ダイスを振る
  } else if (/^[1-9]\d*d.+$/.test(user_message)) {
    var indexOf_d = user_message.indexOf('d');
    var dice = {};
    dice.count = Number(user_message.slice(0, indexOf_d));
    dice.pattern = user_message.slice(indexOf_d + 1);

    var result = [];
    var sum_result = 0;
    
    if (typeof original_dice[dice.pattern] !== 'undefined') {
      // dice.patternがオリジナルダイスで、登録済みなら
      dice.pattern = original_dice[dice.pattern].split(',');
      var result = [];
      for(var i=0;i<dice.count;i++){result[i]=dice.pattern[Math.floor(Math.random()*(dice.pattern.length))];}
      reply_text = user_message + ' = ' + result.join('. ');
    } else if (1<Number(dice.pattern)){
    // dice.patternが数値で、2以上の正の整数なら
      dice.pattern = parseInt(dice.pattern);
      for(var i=0;i<dice.count;i++){result[i]=Math.ceil(Math.random()*dice.pattern);sum_result+=result[i];}
      if(1<i){result[i]='\n計' + sum_result;}
      reply_text = user_message + ' = ' + result.join('. ');
    }
  // コマンド
  } else if (user_message.indexOf('/') === 0) {
    user_message = user_message.substring(1);
    if (user_message === '?') {
      // ヘルプを表示
      reply_text = '【ヘルプ】/?\n'
                    + '１．ダイスを振る\n'
                    + '　　[num1]d[num2]\n'
                    + '　　(例) 1d6\n'
                    + '２．オリジナルダイスを振る\n'
                    + '　　[num1]d[title]\n'
                    + '　　(例) 1dおみくじ\n'
                    + '３．オリジナルダイス登録\n'
                    + '　　[title]=[str1],[str2],[str3],... \n'
                    + '　　(例) おみくじ=大吉,中吉,小吉,末吉,凶,大凶\n'
                    + '４．オリジナルダイス削除\n'
                    + '　　[title]=delete\n'
                    + '　　(例) おみくじ=delete\n'
                    + '５．オリジナルダイスのリスト\n'
                    + '　　/list または /listfull';
    } else if(user_message === 'listfull'){
      // オリジナルダイスの詳しいリストを表示
      reply_text = '【完全リスト】';
      for(var key in original_dice){
        reply_text += '\n' + key + ' is [' + original_dice[key] + ']';
      }
    } else if(user_message === 'list'){
      // オリジナルダイスの簡易リストを表示
      reply_text = '【簡易リスト】';
      for(var key in original_dice){
        reply_text += '\n' + key + ' is ' + (original_dice[key].match(/,/g).length + 1) + '面ダイス';
      }
    } else {
      return;
    }
  } else if (user_message === "testForAdmin.") {
    // テスト用
    reply_text = "testなう";
  } else {
    return;
  }
  
  // メッセージを返信
  
  var reply_message = [{type: 'text', text: reply_text}];
  if(user_message === "testForAdmin."){
    reply_message = createImage();
  }
  
  UrlFetchApp.fetch(line_endpoint, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    method: 'post',
    payload: JSON.stringify({
      replyToken: reply_token,
      messages: reply_message,
    }),
  });
  return ContentService.createTextOutput(JSON.stringify({content: 'post ok'})).setMimeType(ContentService.MimeType.JSON);


}

///*
function doTest(){
  var testMessage ="testForAdmin.";
  var testObject = {"postData":{"contents":{"events":[{"groupId": 002,"roomId": 001,"replyToken": 0000,"message":{"text": testMessage}}]}}};
  testObject.postData.contents = JSON.stringify(testObject.postData.contents);
  var testReply = doPost(testObject);
  Logger.log(testReply);
}
//*/
