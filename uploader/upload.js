const url = 'upload.php';
const form = document.querySelector('form');
const maxFileSize = 5242880;
const inpUrl =  document.querySelector(".input-url");
const createPreviewBtn = document.querySelector(".create-preview");
const prevInput = document.querySelector(".prev-url");
const bbInput = document.querySelector(".bb-url");
const widthInp = document.querySelector("input.width");
const heightInp = document.querySelector("input.height");

function checkSize(event) {
    let min = +event.target.min;
    let max = +event.target.max;
    if ( +event.target.value < min ) {
        event.target.value = min;
        return;
    }
    if ( +event.target.value > max ) {
        event.target.value = max;
        return;
    }
}

widthInp.addEventListener("change", checkSize);
heightInp.addEventListener("change", checkSize);
createPreviewBtn.addEventListener("click", createThumbnail);
form.addEventListener('submit', e => {
    e.preventDefault();
    const files = document.querySelector('[type=file]').files;
    const formData = new FormData();
    checkFile(files);
    if (checkFile(files) === true) {
        document.querySelector("#preview-image").src = "none.png";
        inpUrl.value = "Loading...";

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            formData.append('files[]', file);
        }

        fetchTimeout(15000, fetch(url, {
            method: 'POST',
            body: formData
        }).then(response => {
            return response.json();
        }).then(json => {
            if (json.error) {
                inpUrl.value = "Ошибка: " + json.error;
                inpUrl.classList.add("error");
            }
            if (json.url) {
                loadPreview(json.url)
            }
        }).catch(e => {
            document.querySelector(".input-url").value = "Ошибка..." + e;
        }));
    }
});

function loadPreview(text) {
     if ( !text ) {
         return;
     }
     document.querySelector("div.preview").style.display = "block";
     let baseUrl = window.location.href.replace(/\/[^\/]*$/, '');
     let url = baseUrl + '/' + text;
     inpUrl.value = url;
     widthInp.value = "320";
     document.querySelector("#preview-image").src = createThumbnail();
}

function createThumbnail() {
    let width = +widthInp.value ? `${+widthInp.value}x` : ``;
    let height = +heightInp.value? `${+heightInp.value}_` : `_`;
    let baseUrl = window.location.href.replace(/\/[^\/]*$/, '');
    let url = inpUrl.value.replace(baseUrl + "/img/", "");
    url = baseUrl + `/img/${width+height+url}`;
    prevInput.value = url;
    bbInput.value = createBBcode();
    console.log(createBBcode());
    return url;
}

function createBBcode() {
    return `[url=${inpUrl.value}][img]${prevInput.value}[/img][/url]`;
}

function copy(event) {
    let copyText = event.target.previousElementSibling;
    copyText.select();
    document.execCommand("copy");
 }

document.querySelectorAll(".copybutton").forEach( btn => { btn.addEventListener("click", copy) });


function fetchTimeout(ms, promise) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            reject(new Error("timeout"))
        }, ms);
        promise.then(resolve, reject)
    })
}

document.querySelector("input.file").addEventListener('change', e => {
    checkFile(e.target.files);
});


function checkFile(files) {
    inpUrl.classList.remove("error");
    if (files.length === 0) {
        return false;
    }
    document.querySelector(".filename-url").value = files[0].name + "; Size: " + files[0].size;
    if (files[0].size > maxFileSize) {
        inpUrl.value = "Error! [Max File Size]";
        inpUrl.classList.add("error");
        return false;
    }

    if (files[0].type !== 'image/png' && files[0].type !== 'image/jpeg' && files[0].type !== 'image/jpg' && files[0].type !== 'image/gif') {
        inpUrl.value = "Error![" + files[0].type + "] not allowed";
        inpUrl.classList.add("error");
        return false;
    }

    return true;
}