let isAsync = true;
try {
    eval('async () => {}');
    console.log("test end");
} catch (e) {
    console.log(e);
    if ( e instanceof SyntaxError )
        isAsync = false;
    else
        throw e; // throws CSP error
}

window.onload = () => {
    fetch('https://api.whatismybrowser.com/api/v2/user_agent_parse', {
        method: 'POST',
        headers: {'X-API-KEY': '0416dfac5f50dad1dbdcf50f80ca8ff3'},
        mode: 'cors',
        body: `{"user_agent": "${navigator.userAgent}"}`
    }).then(resp => resp.json()).then(json => {
        if ( json.result.code === "success" ) {
            document.querySelector(".userAgentShort").textContent = json.parse.simple_software_string;
            document.querySelector(".userAgent").textContent =  navigator.userAgent;

        } else {
            document.querySelector(".userAgent").textContent = navigator.userAgent;
        }
    });
    if ( !isAsync ) {
        document.querySelector(".testAsync").textContent = "Async/await not available!"
    } else {
        document.querySelector(".testAsync").textContent = "Async/await available!"
        document.querySelector(".testAsync").classList.add("green");
    }
};