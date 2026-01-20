<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Upload image service</title>
    <link href="index.css" rel="stylesheet">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css" media="none"
          onload="if(media!='all')media='all'">
    <style>
        .nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(10, 14, 39, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 140, 0, 0.2);
            padding: 12px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .nav a {
            color: #ffffff;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .nav a:hover {
            color: #ff8c00;
        }

        .nav-home {
            font-size: 1.1rem;
        }

        body {
            padding-top: 50px;
        }
    </style>
</head>

<body>
<nav class="nav">
    <a href="../index.html" class="nav-home">← alxgk.ru</a>
    <a href="../index.html">Главная</a>
</nav>
<div class="uploader parent">
    <div class="w3-panel w3-dark-gray w3-card w3-display-container uploader-container">
        <div class="form-wrapper">
            <form method="post" enctype="multipart/form-data">
                <input type="file" name="files[]" class="file"/>
                <input type="text" name="url" class="filename-url w3-input w3-border" readonly
                       placeholder="Max: 5Mb; Formats: [jpg,jpeg,png,gif]"/>
                <button class="file-btn w3-button w3-white w3-border"
                        onclick="document.querySelector('input.file').click();"type="button">Choose file
                </button>
                <input type="submit" value="Upload File" name="submit"
                       class="w3-button w3-white w3-border w3-border-blue submit"/>
            </form>
        </div>
        <div class="copy-wrapper">
        <label>Full image link:</label>
        <input type="text" name="url" class="input-url w3-input w3-border" readonly/>
            <div class="copybutton" title="Copy"></div>
        </div>
        <div class="preview">
            <img id="preview-image" src="none.png" class="w3-card">
            <div class="sizing-box-wrapper">
                <button class="copy create-preview w3-button w3-white w3-border" title="Create and copy thumbnail url">Create thumbnail</button>
                <input type="number" class="width thumb w3-input w3-border" placeholder="Width[320]" min="0" max="1920"/>
                <input type="number" class="height thumb w3-input w3-border" placeholder="Height[0]" min="0" max="1080"/>
                </div>
            <div class="prev-url-wrapper">
            <label>Thumbnail:</label>
            <input type="text" name="prev-url"
                                                 class="prev-url thumb w3-input w3-border" readonly
                                                 placeholder="Preview link output"/>
                <div class="copybutton" title="Copy"></div>
            </div>

            <div class="bb-code-url-wrapper">
            <label>BB-code:</label>
            <input type="text" name="bb-url"
                                                 class="bb-url thumb w3-input w3-border" readonly
                                                 placeholder="BB-code link output"/>
                <div class="copybutton" title="Copy"></div>
            </div>

        </div>
    </div>
    <script src="upload.js"></script>
</div>
<div style="font-size:8px;max-width: 640px;margin: 0 auto;padding: 15px;">
<b>Правила использования:</b>
<br>
1. Запрещается размещение изображений, содержащих пропаганду наркотиков и провоцирующих социальную, расовую, национальную, половую, религиозную и др. ненависть и вражду. 
<br>
2. Владельцы ресурса вправе удалить изображение в случае нарушений правил сайта и действующего законодательства. Запрещается размещение файлов и изображений, нарушающих авторское право и соответствующие смежные права. 
<br>
3. Владельцы сайта не несут ответственность за содержание изображений и файлов, размещенных пользователями. 
<br>
4. Решение владельцев сайта об удалении размещенных пользователями файлов и изображений не может быть оспорено пользователями.
Пользование сайтом alxgk.ru является свидетельством безоговорочного принятия условий данных Правил
</div>
</body>

</html> 