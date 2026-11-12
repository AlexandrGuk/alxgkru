<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$storage_file = __DIR__ . '/scores.json';
$max_entries = 10;

function read_scores($file) {
    if (!file_exists($file)) {
        return [];
    }
    $fp = @fopen($file, 'r');
    if (!$fp) {
        return [];
    }
    $data = [];
    if (flock($fp, LOCK_SH)) {
        $raw = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        if ($raw !== false && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }
    }
    fclose($fp);
    return $data;
}

function sort_scores(&$scores) {
    usort($scores, function ($a, $b) {
        $sA = isset($a['score']) ? (int)$a['score'] : 0;
        $sB = isset($b['score']) ? (int)$b['score'] : 0;
        if ($sA !== $sB) {
            return $sB - $sA;
        }
        $wA = isset($a['wave']) ? (int)$a['wave'] : 0;
        $wB = isset($b['wave']) ? (int)$b['wave'] : 0;
        if ($wA !== $wB) {
            return $wB - $wA;
        }
        $kA = isset($a['kills']) ? (int)$a['kills'] : 0;
        $kB = isset($b['kills']) ? (int)$b['kills'] : 0;
        return $kB - $kA;
    });
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $scores = read_scores($storage_file);
    sort_scores($scores);
    echo json_encode([
        'success' => true,
        'scores' => array_slice($scores, 0, $max_entries)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);
    if (!is_array($payload)) {
        $payload = $_POST;
    }

    $name = isset($payload['name']) ? trim((string)$payload['name']) : '';
    $name = preg_replace('/[\x00-\x1F\x7F]+/u', '', $name);
    if (function_exists('mb_substr')) {
        $name = mb_substr($name, 0, 16, 'UTF-8');
    } else {
        $name = substr($name, 0, 16);
    }
    if ($name === '') {
        $name = 'ОХОТНИК';
    }

    $score = isset($payload['score']) ? (int)$payload['score'] : 0;
    $wave = isset($payload['wave']) ? (int)$payload['wave'] : 1;
    $kills = isset($payload['kills']) ? (int)$payload['kills'] : 0;
    $headshots = isset($payload['headshots']) ? (int)$payload['headshots'] : 0;

    if ($score <= 0 || $kills < 0 || $wave < 1 || $wave > 500 || $kills > 20000) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректные данные результата'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $headshots = max(0, min($kills, $headshots));
    $max_plausible_score = ($kills * 2500) + ($wave * 3000) + 1500;
    if ($score > $max_plausible_score) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Результат отклонен проверкой'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fp = @fopen($storage_file, 'c+');
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Не удалось открыть таблицу рекордов'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ошибка блокировки файла'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = stream_get_contents($fp);
    $scores = [];
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $scores = $decoded;
        }
    }

    $entry = [
        'name' => $name,
        'score' => $score,
        'wave' => $wave,
        'kills' => $kills,
        'headshots' => $headshots,
        'date' => date('Y-m-d')
    ];

    $norm_name = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
    $existing_index = -1;
    foreach ($scores as $idx => $item) {
        $item_name = isset($item['name']) ? (string)$item['name'] : '';
        $norm_item = function_exists('mb_strtolower') ? mb_strtolower($item_name, 'UTF-8') : strtolower($item_name);
        if ($norm_item === $norm_name) {
            $existing_index = $idx;
            break;
        }
    }

    if ($existing_index >= 0) {
        $prev_score = isset($scores[$existing_index]['score']) ? (int)$scores[$existing_index]['score'] : 0;
        if ($score >= $prev_score) {
            $scores[$existing_index] = $entry;
        }
    } else {
        $scores[] = $entry;
    }

    sort_scores($scores);
    $scores = array_slice($scores, 0, 25);

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($scores, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode([
        'success' => true,
        'scores' => array_slice($scores, 0, $max_entries)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
