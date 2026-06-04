<?php
include('SimpleImage.php');
$image = new SimpleImage();
$image->load($_GET['file']);
$width = $_GET['width'] ?? "";
$height = $_GET['height'] ?? "";
if ($width && $height) {
    $image->resize($width, $height);
    $image->output();
    return;
}
if ($width) {
    $image->resizeToWidth($width);
    $image->output();
    return;
}
if ($height) {
    $image->resizeToHeight($height);
    $image->output();
    return;
}
$image->output();