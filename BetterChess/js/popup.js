const NOTRUNNING = "Status: Not Running";
const RUNNING = "Status: Running";
const BASIC_USER_MAX_ENGINE_DEPTH = 5;
const PREMIUM_ENABLED = false
let is_user_premium = false;
let userToken = "";
const fetchPost = async (endpoint, body) =>  {
  const res = await fetch('https://chess-aid.herokuapp.com/' + endpoint,
{
  method: "POST",
  headers: {
      "Content-Type": "application/json",
  },
  body: JSON.stringify(body), //
})

const json = await res.json()

console.log("body:",body,"\n","endpoint:", endpoint, "\n", "response:", json, "\n")
return  Promise.resolve(json)
}

const depthMap = {
  3:"1500",
  4:"1600",
  5:"1700",
  6:"1800",
  7:"2000",
  8:"2200",
  9:"2700",
  10:"2900",
  11: "3000",
  12: "3100",
  13:"3200",
  14: "3250",
  15:"3300",
}
const depthMapHuman = {
  3:"1500",
  4:"1600",
  5:"1700",
  6:"1800",
  7:"2000",
  8:"2200",
  9:"2500",
  10:"2700",
  11: "3000",
  12: "3100",
  13:"3200",
  14: "3250",
  15:"3300",
}

const getRandomToken = () => {
  // E.g. 8 * 32 = 256 bits token
  var randomPool = new Uint8Array(32);
  crypto.getRandomValues(randomPool);
  var hex = '';
  for (var i = 0; i < randomPool.length; ++i) {
      hex += randomPool[i].toString(16);
  }
  // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
  return hex;
}

chrome.storage.sync.get('userid', function(items) {
  let userToken = items.userid;
  if (userToken) {
      userId = userToken;
  } else {
    userToken = getRandomToken();
      chrome.storage.sync.set({userid: userToken}, function() {
          userId = userToken
      });
  }
});

const getToggleBody = (feature) => {
  return {
    feature,
    enemyUnderAttack:document.querySelector("#toggleEnemyUnderAttack").checked,
    selfUnderAttack:document.querySelector("#toggleSelfUnderAttack").checked, 
    controlledByEnemy:document.querySelector("#toggleControlledByEnemy").checked,
    bestMove:document.querySelector("#toggleBestMove").checked, 
    evalBar:document.querySelector("#toggleEvalBar").checked, 
    openingsExplorer:document.querySelector("#toggleOpeningsExplorer").checked, 
    userId,
    time: new Date().toISOString()}
}



async function checkContentScriptRunning(){
  let queryOptions = { active: true, currentWindow: true };
let tabs = await chrome.tabs.query(queryOptions);
chrome.tabs.sendMessage(tabs[0].id, "are_you_there_content_script?", function(msg) {
  msg = msg || {};
  if (msg.status !== 'yes') {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id, allFrames: true},
      files: ['chess.min.js'],
  });
  }
});
}
checkContentScriptRunning();


document.addEventListener("DOMContentLoaded", function () {

  chrome.storage.local.get("status").then((res) => {
    if (res["status"] === "Running") {
      document.querySelector("#chessAidStatus").innerText = RUNNING;
    }
  });  const toggleMap = {
    0: "toggleControlledByEnemy",
    1: "toggleEnemyUnderAttack",
    2: "toggleSelfUnderAttack",
    3: "toggleBestMove",

  };

  const toggleColourMap = {
    0: "toggleControlledByEnemyColour",
    1: "toggleEnemyUnderAttackColour",
    2: "toggleSelfUnderAttackColour",
    3: "toggleBestMoveColour",
  };

  const setColourBasedOnIdAndIdx = (id, idx, colour = undefined) => {
    let colourToSet = colour;
    if (colourToSet === undefined) {
      chrome.storage.sync.get([id]).then((res) => {
        colourToSet = res[id];
        setColour(colourToSet, toggleMap, idx, id);
      });
    } else {
      setColour(colourToSet, toggleMap, idx, id);
    }
  };

  [ 
    "toggleEvalBar",
    "toggleOpeningsExplorer",
    "toggleStockfishSpinner",
    "bulletMode",
    "humanMode",
    "handAndBrain",
    "toggleControlledByEnemy",
    "toggleEnemyUnderAttack",
    "toggleSelfUnderAttack",
    "toggleBestMove"
  ].forEach((key) => {
    chrome.storage.sync.get([key]).then((res) => {
      if (res[key] === false) {
        document.querySelector("#" + key).checked = false;
      } else if (key === "humanMode"){
        setHumanWarning(true)
      }
    });
  });

  [
    "controlledByEnemyOpacity",
    "enemyUnderAttackOpacity",
    "selfUnderAttackOpacity",
    "bestMoveOpacity"
  ].forEach((key) => {
    chrome.storage.sync.get([key]).then((res) => {
      if (res[key]) {
        document.querySelector("#" + key).value = res[key];
      }
    });
  });

  [
    "colourControlledByEnemy",
    "colourEnemyUnderAttack",
    "colourSelfUnderAttack",
    "colourBestMove"
  ].forEach((id, idx) => {
    setColourBasedOnIdAndIdx(id, idx);
  });

  document.querySelector("#start").addEventListener("click", async () => {
    let queryOptions = { active: true, currentWindow: true };
    let tabs = await chrome.tabs.query(queryOptions);
    try {
      chrome.tabs.sendMessage(tabs[0].id, "start");
    document.querySelector("#chessAidStatus").innerText = RUNNING;
    chrome.storage.local.set({status: "Running"});
    fetchPost('sessionStart', {
      time: new Date().toISOString(),
      userId
    })
    } catch (e){
      alert("ChessAid requires the page to be refreshed")
    }
    
  });

  document.querySelector("#pause").addEventListener("click", async () => {
    let queryOptions = { active: true, currentWindow: true };
    let tabs = await chrome.tabs.query(queryOptions);
    try {

    chrome.tabs.sendMessage(tabs[0].id, "pause");
    document.querySelector("#chessAidStatus").innerText = NOTRUNNING;
    chrome.storage.local.set({status: "Not Running"});
    fetchPost('sessionEnd', {
      time: new Date().toISOString(),
      userId
    })
  } catch (e){ 
    alert("ChessAid requires the page to be refreshed")
  
  }});

  document
    .querySelector("#toggleControlledByEnemy")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleControlledByEnemy").checked;
      chrome.storage.sync.set({
        toggleControlledByEnemy: checked,
      });
      try {
        chrome.tabs.sendMessage(tabs[0].id, "toggleControlledByEnemy");
        fetchPost('toggle', getToggleBody("controlledByEnemy"))
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
      // reset();
    });

  document
    .querySelector("#toggleEnemyUnderAttack")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleEnemyUnderAttack").checked;
      chrome.storage.sync.set({
        toggleEnemyUnderAttack: checked,
      });
      try {
        chrome.tabs.sendMessage(tabs[0].id, "toggleEnemyUnderAttack");
        fetchPost('toggle', getToggleBody("enemyUnderAttack"))
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
      // reset();
    });

  document
    .querySelector("#toggleSelfUnderAttack")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleSelfUnderAttack").checked;
      chrome.storage.sync.set({
        toggleSelfUnderAttack: checked,
      });
      try {
        chrome.tabs.sendMessage(tabs[0].id, "toggleSelfUnderAttack");
        fetchPost('toggle', getToggleBody("selfUnderAttack"))
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
      // reset();
    });

    document
    .querySelector("#toggleBestMove")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleBestMove").checked;
      chrome.storage.sync.set({
        toggleBestMove: checked,
      });
      try {
        chrome.tabs.sendMessage(tabs[0].id, "toggleBestMove");
        fetchPost('toggle', getToggleBody("bestMove"))
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
      // reset();
    });

    document
    .querySelector("#toggleEvalBar")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleEvalBar").checked;
      chrome.storage.sync.set({
        toggleEvalBar: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "toggleEvalBar");
        fetchPost('toggle', getToggleBody("evalBar"))
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
      // reset();
    });

    document
    .querySelector("#toggleOpeningsExplorer")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleOpeningsExplorer").checked;
      chrome.storage.sync.set({
        toggleOpeningsExplorer: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "toggleOpeningsExplorer");
        fetchPost('toggle', getToggleBody("openingsExplorer"))
      }
        catch(e){
          console.log("Caught error: ", e)
        }
    });

    document
    .querySelector("#toggleStockfishSpinner")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#toggleStockfishSpinner").checked;
      chrome.storage.sync.set({
        toggleStockfishSpinner: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "toggleStockfishSpinner");
        // fetchPost('toggle', getToggleBody("openingsExplorer"))
      }
        catch(e){
          console.log("Caught error: ", e)
        }
    });

    document
    .querySelector("#bulletMode")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#bulletMode").checked;
      chrome.storage.sync.set({
        bulletMode: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "bulletMode");
        // fetchPost('toggle', getToggleBody("openingsExplorer"))
      }
        catch(e){
          console.log("Caught error: ", e)
        }
    });

    const setHumanWarning = (checked) =>{
      console.log("checked: ", checked)
      let textContainer = document.querySelector("#humanWarning");
      if (checked){
        textContainer.innerHTML = '<h2 style="color:blue">Human mode is on, expect mistakes from Stockfish</h2>'
      } else {
        textContainer.innerHTML = ""
      }
    }


    document
    .querySelector("#humanMode")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#humanMode").checked;
      let textContainer = document.querySelector("#humanWarning");
      setHumanWarning(checked)
      chrome.storage.sync.set({
        humanMode: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "humanMode");
      }
        catch(e){
          console.log("Caught error: ", e)
        }
    });

    document
    .querySelector("#handAndBrain")
    .addEventListener("click", async () => {
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      let checked = document.querySelector("#handAndBrain").checked;
      chrome.storage.sync.set({
        handAndBrain: checked,
      });
      try{
        chrome.tabs.sendMessage(tabs[0].id, "handAndBrain");
      }
        catch(e){
          console.log("Caught error: ", e)
        }
    });

  [
    "colourControlledByEnemy",
    "colourEnemyUnderAttack",
    "colourSelfUnderAttack",
    "colourBestMove"
  ].forEach((id, idx) => {
    document.querySelector("#" + id).addEventListener("input", async (e) => {
      const val = { [id]: e.target.value };
      chrome.storage.sync.set(val);
      setColourBasedOnIdAndIdx(id, idx, e.target.value);
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      try{
        chrome.tabs.sendMessage(
          tabs[0].id,
          `colourChange ${id} ${e.target.value}`
        );
      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
     
    });
  });

  [
    "controlledByEnemyOpacity",
    "enemyUnderAttackOpacity",
    "selfUnderAttackOpacity",
    "bestMoveOpacity",
  ].forEach((id, idx) => {
    document.querySelector("#" + id).addEventListener("input", async (e) => {
      const val = { [id]: e.target.value };
      chrome.storage.sync.set(val);
      let queryOptions = { active: true, currentWindow: true };
      let tabs = await chrome.tabs.query(queryOptions);
      try {
        chrome.tabs.sendMessage(
          tabs[0].id,
          `opacityChange ${id} ${e.target.value}`
        );

      } catch(e){
        alert("ChessAid requires the page to be refreshed")
      }
    
    });
  });

  function setColour(colourToSet, toggleMap, idx, id) {
    if (colourToSet) {
      document
        .querySelector(":root")
        .style.setProperty("--" + toggleColourMap[idx], colourToSet);
      document.querySelector("#" + id).value = colourToSet;
    }
  }

  function setDepth(value){
    document.querySelector("#engineDepth").value = value;
    if (document.querySelector("#humanMode").checked){
      document.querySelector("#depth").innerText = depthMapHuman[value] ?? "3300+";
    } else {
      document.querySelector("#depth").innerText = depthMap[value] ?? "3300+";
    }
  }

  document.querySelector("#engineDepth").addEventListener("input", async (e) => { 

    const slider = e.target;
    const attemptedDepth = slider.value;
    const premiumWarningContainer = document.querySelector("#engineDepthPremiumWarningContainer");
    if (attemptedDepth > BASIC_USER_MAX_ENGINE_DEPTH && !is_user_premium && PREMIUM_ENABLED){
      slider.value = BASIC_USER_MAX_ENGINE_DEPTH;
      document.querySelector("#engineDepthPremiumWarningContainer").style.display = 'flex'
      premiumWarningContainer.style.display = 'flex'
    } else {
      premiumWarningContainer.style.display = 'none'
    }

  if (document.querySelector("#humanMode").checked){
    document.querySelector("#depth").innerText = depthMapHuman[document.querySelector("#engineDepth").value] ?? "3300+";
  }else {
    document.querySelector("#depth").innerText = depthMap[document.querySelector("#engineDepth").value] ?? "3300+";
  }

    const val = { engineDepth: e.target.value };
    chrome.storage.sync.set(val);
    let queryOptions = { active: true, currentWindow: true };
    let tabs = await chrome.tabs.query(queryOptions);
    try{
      chrome.tabs.sendMessage(
        tabs[0].id,
        `depth ${e.target.value}`
      );

      fetchPost('engineStrength', {userId, strength:e.target.value, time: new Date().toISOString()})

    } catch(e){
      alert("ChessAid requires the page to be refreshed")
    }
  });


    chrome.storage.sync.get(["engineDepth"]).then((res) => {
      if (res["engineDepth"]) {
        setDepth(res["engineDepth"])
      }
    });

    document.querySelector("#bugReport").addEventListener('click', ()=>{
      window.open("https://docs.google.com/forms/d/e/1FAIpQLSf663B1ESklLCydLnSLidH5n384DhkY7NWipwf51_z0PVkX_w/viewform?usp=pp_url", '_blank').focus();
    })

    document.querySelector("#feedback").addEventListener('click', ()=>{
      window.open("https://chrome.google.com/webstore/detail/chesscom-chess-aid/cocfgoaklpgnlpbicmgjadaadikoljaf?hl=en&authuser=0", '_blank').focus();
    })

    document.querySelector("#help").addEventListener('click', ()=>{
      window.open("https://docs.google.com/document/d/1ySt2rlqVqWS2NnihCdRo2MKhmudmozmRZGZTsBxQncw/edit?usp=sharing", '_blank').focus();
    })

    document.querySelector("#discord").addEventListener('click', ()=>{
      window.open("https://discord.gg/99TntBq8ud", '_blank').focus();
    })
 
});

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   if (request.kind.startsWith("Status")) {
//     document.querySelector("#chessAidStatus").innerText = request.kind;
//   }
// });

// chrome.storage.onChanged.addListener(function(changes, namespace) {
//   if ("status" in changes){
//     document.querySelector("#chessAidStatus").innerText = changes.status.newValue;
//   }
// })


// const reset = async () =>{
//   let queryOptions = { active: true, currentWindow: true };
//   let tabs = await chrome.tabs.query(queryOptions);
//   chrome.tabs.sendMessage(tabs[0].id, "resetHighlights");
// }