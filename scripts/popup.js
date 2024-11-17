// LOGIC BEGIND THE POPUP
// State object to hold the values
var state = {
  hint1_hint: null,
  hint1_example :null,
  hint2_hint: null,
  hint2_example: null,
  hint3_hint: null,
  hint3_example:null,
  hint3_protip:null,
  code_analysis:null,
};

document.addEventListener('DOMContentLoaded', function() {
  const problemContent = document.getElementById('problemContent');
  const loading = document.getElementById('loading');
  const debug = document.getElementById('debug');
  const ovHelp = document.getElementById('overall-help');

  function createRetryButton() {
    const button = document.createElement('button');
    button.textContent = 'Retry Loading';
    button.className = 'retry-button';
    button.onclick = scrapeProblemDetails;
    return button;
  }

  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  
  var probTitle= null
  var probDisc = null
  var probDiff =null

  async function scrapeProblemDetails() {
    try {
      const tab = await getCurrentTab();
      
      if (!tab.url.includes('leetcode.com/problems/')) {
        loading.textContent = 'Please open a LeetCode problem page first.';
        loading.className = 'error';
        problemContent.innerHTML = '';  // Clear any previous content
        debug.innerHTML = '';  // Clear debug info
        ovHelp.innerHTML=''
        return;
      }

      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return new Promise((resolve) => {
            let attemptCount = 0;
            const maxAttempts = 50; // Increased attempts
            const debugInfo = [];

            function logDebug(msg) {
              debugInfo.push(`[Attempt ${attemptCount}] ${msg}`);
            }

            function extractContent() {
              attemptCount++;
              
              // Try all possible selectors for description
              const possibleDescriptionSelectors = [
                'div[data-track-load="description_content"]',
                '[class*="description-content"]',
                '[class*="_description_"]',
                '.content__u3I1',
                '.question-content__JfgR',
                '#problem-content',
                '.problems_problem_content__Xm_eO',
                '[data-cy="question-content"]'
              ];

              let descriptionElement = null;
              for (const selector of possibleDescriptionSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                  descriptionElement = element;
                  logDebug(`Found description using selector: ${selector}`);
                  break;
                }
              }

              // Get title using multiple selectors
              const titleElement = 
                document.querySelector('[data-cy="question-title"]') ||
                document.querySelector('.mr-2.text-lg.font-medium') ||
                document.querySelector('[class*="title"]');
                if (titleElement) {
                  logDebug('Found title element');
                }

              const difficultyElement = 
                document.querySelector('[diff]') ||
                document.querySelector('.bg-olive') ||
                document.querySelector('[class*="difficulty"]');

              if (titleElement) {
                logDebug('Found title element');
              }

              if (difficultyElement) {
                logDebug('Found difficulty element');
              }

              // Only proceed if we have at least a title or description
              if (titleElement || descriptionElement) {
                const data = {
                  title: titleElement ? titleElement.textContent.trim() : 'Title not found',
                  difficulty: difficultyElement ? difficultyElement.textContent.trim() : 'Unknown',
                  description: descriptionElement ? descriptionElement.innerHTML : 'Description not found',
                  debugInfo: debugInfo.join('\n')
                };

                logDebug('Successfully collected data');
                resolve(data);
              } else {
                logDebug('Required elements not found yet');
                
                if (attemptCount < maxAttempts) {
                  setTimeout(extractContent, 200);
                } else {
                  logDebug('Max attempts reached');
                  resolve({
                    title: 'Content not loaded',
                    difficulty: 'Unknown',
                    description: 'Failed to load content',
                    debugInfo: debugInfo.join('\n')
                  });
                }
              }
            }

            extractContent();
          });
        }
      });

      const result = injectionResults[0].result;

      loading.style.display = 'none';

      probTitle=result.title
      probDiff= result.difficulty
      probDisc =result.description

      // Display the content
      problemContent.innerHTML = `
        <div class="header">
          <span class="title">${result.title}</span>
          <span class="difficulty">${result.difficulty}</span>
        </div>
        <div class="description">
          ${result.description}
        </div>
      `;
     
      // Show debug info
      debug.innerHTML = `<pre>Loading your hints....</pre>`;
      //check if the question has been already searched. if so return the same previous result 
      jsonoutput=localStorage.getItem(result.title)
      if (jsonoutput!=null){
        ParseJsonHint(jsonoutput)
      }else{
        await LLM(result.title,result.difficulty,result.description)
      }
      debug.innerHTML = `<pre>Your customized hints are ready</pre>`;
        // Set up the "Help 1" button click handler
        document.getElementById('help-1').addEventListener('click', async function() {
          
            // Perform calculations on the scraped data
            
            const { hint, example,protip } =await help('help-1',result.title,result.difficulty,result.description)
            // Display the result in the "help1" div or in the button itself
            document.getElementById('help1-help').innerText = hint;
            document.getElementById('help1-example').innerText = example;
        
        });
        document.getElementById('help-2').addEventListener('click',async function() {
          
          // Perform calculations on the scraped data
          
          const { hint, example,protip }  =await help('help-2',result.title,result.difficulty,result.description)
          // Display the result in the "help2" div or in the button itself
          document.getElementById('help2-help').innerText = hint;
          document.getElementById('help2-example').innerText = example;
      
      });
      document.getElementById('help-3').addEventListener('click',async function() {
          
        // Perform calculations on the scraped data
        
        const { hint, example,protip }  =await help('help-3',result.title,result.difficulty,result.description)
        // Display the result in the "help2" div or in the button itself
        document.getElementById('help3-help').innerText = hint;
        document.getElementById('help3-example').innerText = example;
        document.getElementById('help3-protip').innerText = protip;
    });
    } catch (error) {
      loading.textContent = 'Error loading problem details. Please try again.';
      loading.className = 'error';
      const retryButton = createRetryButton();
      loading.appendChild(document.createElement('br'));
      loading.appendChild(retryButton);
      console.error('Error:', error);
    }
  }

  async function scrapeUserCode() {
    try {
      const tab = await getCurrentTab();
      
      if (!tab.url.includes('leetcode.com/problems/')) {
        loading.textContent = 'Please open a LeetCode problem page first.';
        loading.className = 'error';
        return;
      }
  
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return new Promise((resolve) => {
            let attemptCount = 0;
            const maxAttempts = 50;
            const debugInfo = [];
  
            function logDebug(msg) {
              debugInfo.push(`[Attempt ${attemptCount}] ${msg}`);
            }
  
            function extractContent() {
              attemptCount++;
              
              // Try multiple selectors for the code editor
              const possibleCodeSelectors = [
                '.monaco-editor .view-lines', // Main editor content
                '[role="presentation"].view-lines', // Alternative selector
                '.monaco-editor .mtk1', // Code tokens
                '#editor textarea', // Actual textarea element
                '.CodeMirror-code' // Fallback for older versions
              ];
  
              let codeContent = '';
              let foundEditor = false;
  
              for (const selector of possibleCodeSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                  foundEditor = true;
                  logDebug(`Found editor using selector: ${selector}`);
                  
                  // Combine text content from all relevant elements
                  elements.forEach(element => {
                    const text = element.textContent.trim();
                    if (text) {
                      codeContent += text + '\n';
                    }
                  });
                  
                  break;
                }
              }
  
              if (foundEditor && codeContent) {
                logDebug('Successfully extracted code');
                resolve({
                  code: codeContent,
                  debugInfo: debugInfo.join('\n')
                });
              } else {
                logDebug('Code editor not found or empty');
                
                if (attemptCount < maxAttempts) {
                  setTimeout(extractContent, 200);
                } else {
                  logDebug('Max attempts reached');
                  resolve({
                    code: '',
                    error: 'Could not find code editor content',
                    debugInfo: debugInfo.join('\n')
                  });
                }
              }
            }
  
            extractContent();
          });
        }
      });
  
      const result = injectionResults[0].result;
      
      if (result.code) {
      return result.code;
      } else {
        console.error('Failed to extract code:', result.error);
        return null;
      }
      
    } catch (error) {
      loading.textContent = 'Error extracting code. Please try again.';
      loading.className = 'error';
      const retryButton = createRetryButton();
      loading.appendChild(document.createElement('br'));
      loading.appendChild(retryButton);
      console.error('Error:', error);
      return null;
    }
  }

  scrapeProblemDetails();
  document.getElementById('anal-code').addEventListener('click', async function() {
    document.getElementById('analyze-code').innerText = "Your code is been analyzed.Wait for a while....";
    if (probDisc== null){
      await scrapeProblemDetails();
    }

  userCode= await scrapeUserCode();
    if (userCode!=null){
      await MarkdownLLM(probTitle,probDiff,probDisc,userCode)
      if (code_analysis != null){
        // Build and format the analysis content
        console.log(code_analysis)
          const formattedAnalysis = `
          <div>
            <strong>What's Right:</strong>
            <p>${code_analysis.right || "No comments."}</p>
          </div>
          <div>
            <strong>What's Wrong:</strong>
            <p>${code_analysis.wrong || "No comments."}</p>
          </div>
          <div>
            <strong>What can be Improved:</strong>
            <p>${code_analysis.improvements || "No comments."}</p>
          </div>
          <div>
            <strong>Final Thoughts:</strong>
            <p>${code_analysis.conclusion || "No comments."}</p>
          </div>
          `;
        document.getElementById('analyze-code').innerHTML = formattedAnalysis;
      }else{
        document.getElementById('analyze-code').innerText = "there is some problem with the analyzis. Try again later";
      }
    }else{
      document.getElementById('analyze-code').innerText = "there is some problem with the analyzis. Try again later";
    }

});
});


async function help(helpNo,title,difficulty,description){
  if (helpNo==='help-1'){
    if (state.hint1===null){
   await LLM(title,difficulty,description) // Wait for LLM to populate state
    }
      return {  hint: state.hint1_hint,
        example: state.hint1_example,
        protip: ""}
  }
  if (helpNo==='help-2'){
    if (state.hint2===null){
     await LLM(title,difficulty,description)
    }
    return {
      hint: state.hint2_hint,
      example: state.hint2_example,
      protip: ""
    };
  }
  if (helpNo==='help-3'){
    if (state.hint3===null){
   await LLM(title,difficulty,description)
    }
    return  {
      hint: state.hint3_hint,
      example: state.hint3_example,
      protip: state.hint3_protip
    };
}
}

async function LLM(title,difficulty,description){
  const prompt1=title+" "+difficulty+" "+description+"\n"+PROMPT_0
  const API_KEY =""
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt1}`
          }]
        }]
      })
    });

    const data = await response.json();
    const jsonstring= data.candidates[0].content.parts[0].text;
  
    const jsonoutput = jsonstring.match(/{[\s\S]*}/);
    if (!jsonoutput) {
      throw new Error("No valid JSON found in the response.");
    }
    //storing the result in local storage. so that if they open the same question next time we can directly show them the prompt
    localStorage.setItem(title,jsonoutput)

    ParseJsonHint(jsonoutput)
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('analyze-code').innerText = "there is some problem with the analyzis. Try again later";
    return "Error generating hint. Please try again.";
  }
}

async function MarkdownLLM(title,difficulty,description,code){
  const prompt1=PROMPT_1+"\n"+title+" "+difficulty+" "+description+"\n my code:\n"+code
  const API_KEY =""
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt1}`
          }]
        }]
      })
    });

    const data = await response.json();
    var outputstring= data.candidates[0].content.parts[0].text;
    console.log("opstring:"+outputstring)
    const jsonstring = outputstring.match(/{[\s\S]*}/);
    console.log("jsonstring:"+jsonstring)
    if (jsonstring!=null){
      jsonoutput=JSON.parse(jsonstring);
      code_analysis={
        "right":jsonoutput.right,
        "wrong":jsonoutput.wrong,
        "improvements":jsonoutput.improvements,
        "conclusion":jsonoutput.conclusion
      }
    }
   
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('analyze-code').innerText = "there is some problem with the analyzis. Try again later";
    return "Error generating hint. Please try again.";
  }
}

function ParseJsonHint(jsonoutput)
{
  const jsonObject = JSON.parse(jsonoutput);
  state.hint1_hint = JSON.stringify(jsonObject.hints[0].hint, null, 2);
  state.hint1_example = JSON.stringify(jsonObject.hints[0].example, null, 2);
  state.hint2_hint =JSON.stringify(jsonObject.hints[1].hint, null, 2);
  state.hint2_example =JSON.stringify(jsonObject.hints[1].example, null, 2);
  state.hint3_hint = JSON.stringify(jsonObject.hints[2].hint, null, 2);
  state.hint3_example = JSON.stringify(jsonObject.hints[2].example, null, 2);
  state.hint3_protip = JSON.stringify(jsonObject.hints[2].pro_tip, null, 2);
}
