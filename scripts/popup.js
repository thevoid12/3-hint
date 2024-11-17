// LOGIC BEGIND THE POPUP
// State object to hold the values
const state = {
  hint1_hint: null,
  hint1_example :null,
  hint2_hint: null,
  hint2_example: null,
  hint3_hint: null,
  hint3_example:null,
  hint3_protip:null
};

document.addEventListener('DOMContentLoaded', function() {
  const problemContent = document.getElementById('problemContent');
  const loading = document.getElementById('loading');
  const debug = document.getElementById('debug');

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

  async function scrapeProblemDetails() {
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
     await LLM(result.title,result.difficulty,result.description)
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

  scrapeProblemDetails();
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
console.log(jsonoutput)
    const jsonObject = JSON.parse(jsonoutput);
    console.log("json Object:"+jsonObject)
    state.hint1_hint = JSON.stringify(jsonObject.hints[0].hint, null, 2);
    state.hint1_example = JSON.stringify(jsonObject.hints[0].example, null, 2);
    state.hint2_hint =JSON.stringify(jsonObject.hints[1].hint, null, 2);
    state.hint2_example =JSON.stringify(jsonObject.hints[1].example, null, 2);
    state.hint3_hint = JSON.stringify(jsonObject.hints[2].hint, null, 2);
    state.hint3_example = JSON.stringify(jsonObject.hints[2].example, null, 2);
    state.hint3_protip = JSON.stringify(jsonObject.hints[2].pro_tip, null, 2);
  } catch (error) {
    console.error('Error:', error);
    return "Error generating hint. Please try again.";
  }
}

// {
//   "hint": "Initialize an empty hash map. Iterate through the `nums` array. For each element `num`, calculate the `complement = target - num`. If the `complement` is in the hash map, return the indices. Otherwise, add `num` and its index to the hash map. Handle edge cases like duplicates. Remember the index is crucial; it's not enough to just know the number itself. ",
//   "example": "For `nums = [3, 2, 4]` and `target = 6`, you start with an empty map. At `nums[0] = 3`, the complement is `6 - 3 = 3`. It's not in the map. Add `{3: 0}`. Next, at `nums[1] = 2`, complement is 4. Not in the map. Add `{2: 1}`. At `nums[2] = 4`, complement is 2. It *is* in the map at index 1! Return `[1, 2]`.",
//   "pro_tip": "Consider the time and space complexity of your solution. Using a hash map makes this a very efficient O(n) time solution (you iterate only once), and O(n) space is acceptable given the constraints."
//   }
