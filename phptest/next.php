<?php
// 前のページから送られてきたデータを受け取る
$username = isset($_POST['username']) ? htmlspecialchars($_POST['username'], ENT_QUOTES, 'UTF-8') : 'ゲスト';
$score = isset($_POST['score']) ? htmlspecialchars($_POST['score'], ENT_QUOTES, 'UTF-8') : '0';
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>確認・送信ページ</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        // Unityへデータを送る関数
        function sendToUnity() {
            // PHPから埋め込まれた変数を使用
            const data = {
                name: "<?php echo $username; ?>",
                score: <?php echo $score; ?>
            };

            // カスタムURLスキームを使ってUnityへ通知
            const jsonString = JSON.stringify(data);
            const url = "unity://onReceiveData?data=" + encodeURIComponent(jsonString);

            // Unity側でキャッチされるURLに遷移
            window.location.href = url;
        }
    </script>
</head>
<body>
    <h2>受け取ったデータ</h2>
    <p>ユーザー名: <strong><?php echo $username; ?></strong></p>
    <p>スコア: <strong><?php echo $score; ?></strong></p>

    <!-- ボタンを押すとUnityへデータが飛ぶ -->
    <button onclick="sendToUnity()">Unityへこのデータを送る</button>
    
    <br><br>
    <a href="index.php">戻る</a>
</body>
</html>