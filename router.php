<?php
$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);

if (preg_match('#/uploader/img/(\d+)x(\d+)?_([^/]+\.(jpg|jpeg|png|gif))$#', $requestPath, $matches)) {
    $width = (int)$matches[1];
    $height = isset($matches[2]) && $matches[2] !== '' ? (int)$matches[2] : 0;
    $filename = $matches[3];
    
    $originalPath = __DIR__ . '/uploader/img/' . $filename;
    
    if (!file_exists($originalPath)) {
        return false;
    }
    
    $imageInfo = getimagesize($originalPath);
    if ($imageInfo === false) {
        return false;
    }
    
    $mimeType = $imageInfo['mime'];
    $originalWidth = $imageInfo[0];
    $originalHeight = $imageInfo[1];
    
    if ($height === 0) {
        $height = (int)($originalHeight * $width / $originalWidth);
    }
    
    $sourceImage = null;
    switch ($mimeType) {
        case 'image/jpeg':
            $sourceImage = imagecreatefromjpeg($originalPath);
            break;
        case 'image/png':
            $sourceImage = imagecreatefrompng($originalPath);
            break;
        case 'image/gif':
            $sourceImage = imagecreatefromgif($originalPath);
            break;
        default:
            return false;
    }
    
    if ($sourceImage === null) {
        return false;
    }
    
    $thumbnail = imagecreatetruecolor($width, $height);
    
    if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
        imagealphablending($thumbnail, false);
        imagesavealpha($thumbnail, true);
        $transparent = imagecolorallocatealpha($thumbnail, 0, 0, 0, 127);
        imagefill($thumbnail, 0, 0, $transparent);
    }
    
    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $width, $height, $originalWidth, $originalHeight);
    
    header('Content-Type: ' . $mimeType);
    
    switch ($mimeType) {
        case 'image/jpeg':
            imagejpeg($thumbnail, null, 90);
            break;
        case 'image/png':
            imagepng($thumbnail);
            break;
        case 'image/gif':
            imagegif($thumbnail);
            break;
    }
    
    imagedestroy($sourceImage);
    imagedestroy($thumbnail);
    exit;
}

return false;

