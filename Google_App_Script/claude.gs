function doPost(e) {
  try {
    // รับข้อมูลที่ส่งมาจาก Frontend
    var requestBody = JSON.parse(e.postData.contents);
    var draft = requestBody.draft;
    var style = requestBody.style;

    if (!draft) {
      return createResponse({ error: 'Missing draft text' });
    }

    // อ่านเฉพาะ API Key จาก Script Properties
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty('CLAUDE_API_KEY');
    
    if (!apiKey) {
      return createResponse({ error: 'Missing CLAUDE_API_KEY in Script Properties' });
    }

    var prompt = 'Please rewrite the following text in the style of ' + style + '. Only return the rewritten text without any additional comments or markdown formatting:\n\n' + draft;

    var url = 'https://api.anthropic.com/v1/messages';

    var payload = {
      "model": "claude-sonnet-5-5",
      "max_tokens": 16000,
      "output_config": { "effort": "medium" },
      "fallbacks": "default",
      "messages": [
        {
          "role": "user",
          "content": prompt
        }
      ]
    };

    // ลบ anthropic-workspace-id ออกจาก Header แล้ว
    var options = {
      "method": "post",
      "headers": {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json"
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    var response = UrlFetchApp.fetch(url, options);
    var data = JSON.parse(response.getContentText());

    if (data.error) {
      return createResponse({ error: data.error.message });
    }

    if (data.stop_reason === 'refusal') {
      return createResponse({ error: 'Claude declined to rewrite this text' });
    }

    var text = (data.content || [])
      .filter(function (block) { return block.type === 'text'; })
      .map(function (block) { return block.text; })
      .join('');

    if (text) {
      return createResponse({ result: text.trim() });
    }
    return createResponse({ error: 'Unknown error occurred' });

  } catch (error) {
    return createResponse({ error: error.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testRewrite() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('CLAUDE_API_KEY') || '';
  Logger.log('Key in use ends with: ' + key.slice(-4));
  var fakeEvent = { postData: { contents: JSON.stringify({ draft: 'hello how are you', style: 'a formal letter' }) } };
  Logger.log(doPost(fakeEvent).getContent());
}
