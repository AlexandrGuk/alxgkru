<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	if (isset($_FILES['files'])) {
		$errors = [];
		$path = 'img/';
		$extensions = ['jpg', 'jpeg', 'png', 'gif'];

		$all_files = count($_FILES['files']['tmp_name']);
		for ($i = 0; $i < $all_files; $i++) {
			$file_name = $_FILES['files']['name'][$i];
			$file_tmp = $_FILES['files']['tmp_name'][$i];
			$file_type = $_FILES['files']['type'][$i];
			$file_size = $_FILES['files']['size'][$i];
			$explResult = explode('.', $_FILES['files']['name'][$i]);
			$file_ext = strtolower(end($explResult));
			$imageFullName = $path . hash('md5', time()) . '.' . $file_ext;
			$info = getimagesize($_FILES['files']['tmp_name'][$i]);

			if ($info === FALSE) {
				$errors[] = 'Not image!';
			}

			if (!in_array($file_ext, $extensions)) {
				$errors[] = 'Extension not allowed: ' . $file_name . ' ' . $file_type;
			}
			if ($file_size > 6097152) {
				$errors[] = 'File size exceeds limit: ' . $file_name . ' ' . $file_type;
			}
			if (empty($errors)) {
				move_uploaded_file($file_tmp, $imageFullName);
				header('Content-Type: application/json; charset=UTF-8');
				print_r(json_encode(array('url' => $imageFullName)));
			}
			if ($errors) {
				header('HTTP/1.1 404 Internal Server Error');
				header('Content-Type: application/json; charset=UTF-8');
				print_r(json_encode(array('error' => $errors, 'code' => 1337)));
			}
		}
	}
}
