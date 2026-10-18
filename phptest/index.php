<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>入力ページ</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h2>Unityへ送るデータの入力</h2>
    
    <!-- next.php へ POSTメソッドでデータを送るフォーム -->
    <form action="next.php" method="POST">
        <label for="username">ユーザー名:</label><br>
        <input type="text" id="username" name="username" value="Unityプレイヤー"><br><br>

        <label for="score">スコア:</label><br>
        <input type="number" id="score" name="score" value="100"><br><br>

        <!-- ボタンを押すと次のページへ遷移 -->
        <button type="submit">次のページへ進む</button>
    </form>
</body>
</html>