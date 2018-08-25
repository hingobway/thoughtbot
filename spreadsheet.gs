// Generates :n number of tweets and sends to processor.
function doGet(e) {
  try {
    // Catch any errors and ouput in JSON format.
    // Grab the main sheet of the spreadsheet and convert the actual entries into a parsable array.
    var sheet = SpreadsheetApp.getActiveSheet();
    var arr = sheet.getSheetValues(
      2,
      1,
      sheet.getLastRow(),
      sheet.getLastColumn()
    );
    var out = []; // Initialize output array.

    // Generate :n tweet strings and add them to the array.
    for (j = 0; j < parseInt(e.parameter.n); j++) {
      // Generate a tweet from one random entry in each column.
      function makeTweet() {
        var str = '';
        for (i = 0; i < sheet.getLastColumn(); i++) {
          // Grab random entry in column, repeat if it's blank.
          function add() {
            var rand = Math.round(Math.random() * (sheet.getLastRow() - 2));
            if (arr[rand][i] != '') {
              str += arr[rand][i] + ' ';
            } else {
              add();
            }
          }
          add();
        }

        // Remove final space and return tweet.
        return str.slice(0, str.length - 1);
      }

      // Add tweet to output array, make a new tweet if it's too long.
      function lenCheck() {
        var cstr = makeTweet();
        if (cstr.length <= 280) {
          out.push(cstr);
        } else {
          lenCheck();
        }
      }
      lenCheck();
    }
    return ContentService.createTextOutput(
      JSON.stringify({
        status: '200',
        messages: out
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: '500',
        error: err
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
