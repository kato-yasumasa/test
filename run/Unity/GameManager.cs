// File: Assets/Scripts/GameManager.cs
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI; // UI要素を使用するため

public class GameManager : MonoBehaviour
{
    public static GameManager Instance; // シングルトンパターン

    [Header("Settings")]
    public GameSettings gameSettings; // GameSettings ScriptableObjectをInspectorで割り当てる

    [Header("UI References")]
    public Text livesText;
    public Text timeLeftText;
    public Text distanceText;
    public GameObject speedUpUI;
    public Text speedUpTimerText;
    public GameObject invincibleUI;
    public Text invincibleTimerText;
    public GameObject titleScreen;
    public GameObject countdownScreen;
    public Text countdownText;
    public GameObject gameOverScreen;
    public Text gameOverDistanceText;
    public Button retryButton;
    public Button backToTitleButton;

    // ゲームの状態
    public enum GameState { Title, Countdown, Playing, GameOver }
    public GameState currentGameState;

    // ゲーム変数
    private int lives;
    private float timeLeft;
    private float distance;
    public int playerLane; // 0:左, 1:中央, 2:右 (publicにしてPlayerControllerからもアクセス可能に)
    private List<GameObject> activeObstacles = new List<GameObject>();
    private List<GameObject> activeItems = new List<GameObject>();
    private float baseGameSpeed; // ベースとなるスクロール速度 (時間とともに増加)

    public bool isSpeedUp;
    private float speedUpTimer;
    public bool isInvincible;
    private float invincibleTimer;

    private int countdownValue;
    private float frameCount; // 障害物生成間隔のカウント用

    private float lastRunSESpawnTime;
    private const float RUN_SE_INTERVAL = 0.2f; // 足音SEの再生間隔

    // オブジェクトの重なり防止用 (レーンごとの最後のスポーンY座標)
    private float[] lastSpawnYByLane = new float[3];

    // Flick入力用
    private Vector2 touchStartPos;
    private const float FLICK_THRESHOLD = 50f; // フリックと認識する閾値 (ピクセル)

    [Header("Prefabs")]
    public GameObject playerPrefab;
    public GameObject[] obstaclePrefabs; // 複数の障害物タイプがある場合
    public GameObject speedUpItemPrefab;
    public GameObject invincibleItemPrefab;
    public GameObject timeItemPrefab;

    private PlayerController playerController; // プレイヤーのスクリプト参照

    // World units for canvas dimensions (カメラのOrthographic Sizeとアスペクト比で計算)
    private float worldScreenHeight;
    private float worldScreenWidth;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
            return;
        }

        // ボタンのリスナーを設定
        if (retryButton != null) retryButton.onClick.AddListener(OnRetryButtonClicked);
        if (backToTitleButton != null) backToTitleButton.onClick.AddListener(OnBackToTitleButtonClicked);

        // カメラのサイズに基づいたワールドスクリーンサイズを計算
        if (Camera.main != null)
        {
            worldScreenHeight = Camera.main.orthographicSize * 2f;
            worldScreenWidth = worldScreenHeight * Camera.main.aspect;
        }
        else
        {
            Debug.LogError("Main Camera not found! Ensure your Main Camera is tagged 'MainCamera'.");
        }
    }

    void Start()
    {
        InitGame();
        SetGameState(GameState.Title);
    }

    void Update()
    {
        float deltaTime = Time.deltaTime; // フレーム間の時間

        HandleInput(); // 入力処理

        // UIは常に更新（状態にかかわらず）
        UpdateUI();

        switch (currentGameState)
        {
            case GameState.Playing:
                UpdatePlayingState(deltaTime);
                break;
            // 他の状態では、Update()で継続的な処理は行わない
        }
    }

    // ゲームのスクロール速度を取得するヘルパーメソッド
    public float GetGameScrollSpeed()
    {
        float currentScrollSpeed = baseGameSpeed;
        if (isSpeedUp)
        {
            currentScrollSpeed *= 2;
        }
        return currentScrollSpeed;
    }

    // ゲームの初期化
    public void InitGame()
    {
        lives = gameSettings.initialLives;
        timeLeft = gameSettings.initialTime;
        distance = 0;
        playerLane = 1; // 中央レーン
        baseGameSpeed = gameSettings.obstacleInitialSpeed; // ベースの速度を初期値に

        isSpeedUp = false;
        speedUpTimer = 0;
        isInvincible = false;
        invincibleTimer = 0;

        frameCount = 0;
        
        // 既存の障害物とアイテムをクリア
        foreach (GameObject obj in activeObstacles) Destroy(obj);
        activeObstacles.Clear();
        foreach (GameObject obj in activeItems) Destroy(obj);
        activeItems.Clear();

        // 各レーンの最終スポーンY座標をリセット
        for (int i = 0; i < lastSpawnYByLane.Length; i++)
        {
            lastSpawnYByLane[i] = -worldScreenHeight / 2f; // 画面下端より少し下
        }

        // プレイヤーの生成または初期化
        if (playerController == null)
        {
            GameObject playerObj = Instantiate(playerPrefab);
            playerController = playerObj.GetComponent<PlayerController>();
        }
        playerController.InitPlayer(playerLane);
        playerController.SetInvincibleVisual(false); // 無敵状態を解除

        AudioManager.Instance.StopAllBGM(); // すべてのBGMを停止
        UpdateUI(); // UIを初期状態に更新
    }

    // ゲームプレイ中の更新ロジック
    private void UpdatePlayingState(float deltaTime)
    {
        baseGameSpeed += gameSettings.gameSpeedIncrement * deltaTime; // 時間とともにゲーム速度を上げる

        float currentScrollSpeed = GetGameScrollSpeed(); // 現在のスクロール速度

        // 時間の減少
        timeLeft -= deltaTime;
        if (timeLeft <= 0)
        {
            timeLeft = 0;
            SetGameState(GameState.GameOver);
            AudioManager.Instance.StopAllBGM();
            AudioManager.Instance.gameOverSE.Play();
            return;
        }

        // 距離の増加
        distance += currentScrollSpeed * deltaTime; // m/sなのでそのまま距離に加算

        // スピードアップ効果の管理
        if (isSpeedUp)
        {
            if (!AudioManager.Instance.speedUpLoopSE.isPlaying)
            {
                AudioManager.Instance.speedUpLoopSE.Play();
            }
            speedUpTimer -= deltaTime;
            if (speedUpTimer <= 0)
            {
                isSpeedUp = false;
                speedUpTimer = 0;
                AudioManager.Instance.speedUpLoopSE.Stop();
            }
        }
        else
        {
            if (AudioManager.Instance.speedUpLoopSE.isPlaying)
            {
                AudioManager.Instance.speedUpLoopSE.Stop();
            }
        }

        // 無敵効果の管理
        if (isInvincible)
        {
            invincibleTimer -= deltaTime;
            if (invincibleTimer <= 0)
            {
                isInvincible = false;
                invincibleTimer = 0;
                playerController.SetInvincibleVisual(false); // プレイヤーの無敵視覚効果を解除
            }
        }

        // 足音SEの再生 (連続的に再生)
        if (Time.time - lastRunSESpawnTime > RUN_SE_INTERVAL)
        {
            if (AudioManager.Instance.runSE != null) {
                 AudioManager.Instance.PlayOneShotSFX(AudioManager.Instance.runSE.clip);
            }
            lastRunSESpawnTime = Time.time;
        }

        // 障害物・アイテムの生成
        frameCount++;
        if (frameCount >= gameSettings.obstacleSpawnIntervalFrames)
        {
            SpawnObstacle();
            frameCount = 0; // フレームカウントをリセット
        }

        if (Random.value < gameSettings.itemSpawnProbability)
        {
            SpawnItem();
        }

        // 衝突判定 (UnityのPhysicsシステムで自動的に検出されるが、ここでは手動でリストを管理)
        CheckCollisions();

        // 障害物・アイテムの位置更新と画面外削除は、各オブジェクトのコンポーネントで管理しても良いが、
        // ここで一括で処理する（ゲーム全体のスクロール速度に依存するため）
        UpdateScrollingObjects(currentScrollSpeed, activeObstacles);
        UpdateScrollingObjects(currentScrollSpeed, activeItems);
    }

    private void UpdateScrollingObjects(float scrollSpeed, List<GameObject> objectList)
    {
        for (int i = objectList.Count - 1; i >= 0; i--)
        {
            GameObject obj = objectList[i];
            if (obj == null) // オブジェクトがすでに破壊されている可能性
            {
                objectList.RemoveAt(i);
                continue;
            }

            obj.transform.position += Vector3.down * scrollSpeed * Time.deltaTime;

            // 画面外に出たオブジェクトを削除
            if (obj.transform.position.y < -worldScreenHeight / 2f - (obj.GetComponent<SpriteRenderer>().bounds.size.y / 2f))
            {
                Destroy(obj);
                objectList.RemoveAt(i);
            }
        }
    }

    // 衝突判定ロジック (OnTriggerEnter2Dを使用するため、ここには直接書かないが、アイテムや障害物との接触で呼ばれるメソッドを想定)
    private void CheckCollisions()
    {
        // 衝突判定は各オブジェクトのOnTriggerEnter2Dで行われるため、ここではリストの管理のみ
        // GameManagerは衝突の結果（ライフ減少、アイテム取得など）を受け取る形になる
    }

    // 障害物の生成
    private void SpawnObstacle()
    {
        if (obstaclePrefabs == null || obstaclePrefabs.Length == 0)
        {
            Debug.LogWarning("Obstacle Prefabs are not assigned!");
            return;
        }

        int lane = Random.Range(0, 3); // 0:左, 1:中央, 2:右
        GameObject chosenObstaclePrefab = obstaclePrefabs[Random.Range(0, obstaclePrefabs.Length)];
        SpriteRenderer prefabSR = chosenObstaclePrefab.GetComponent<SpriteRenderer>();
        float obstacleHeight = prefabSR != null ? prefabSR.bounds.size.y : 1f; // プレハブのスプライトの高さを取得

        // スポーン位置 (画面上端より上)
        float spawnX = GetLaneXPosition(lane, chosenObstaclePrefab);
        float spawnY = worldScreenHeight / 2f + obstacleHeight / 2f; // 画面上端

        // 重なり防止のための調整
        if (lastSpawnYByLane[lane] > -worldScreenHeight / 2f + gameSettings.objectSpawnOffsetY) // レーンに前回のオブジェクトがある場合
        {
            // 前回スポーンしたオブジェクトのY座標 + そのオブジェクトの高さ + オフセット
            float minSpawnY = lastSpawnYByLane[lane] + obstacleHeight + gameSettings.objectSpawnOffsetY;
            spawnY = Mathf.Max(spawnY, minSpawnY);
        }
        
        GameObject newObstacle = Instantiate(chosenObstaclePrefab, new Vector3(spawnX, spawnY, 0), Quaternion.identity);
        activeObstacles.Add(newObstacle);
        lastSpawnYByLane[lane] = newObstacle.transform.position.y; // スポーンしたオブジェクトの実際のY座標を記録
    }

    // アイテムの生成
    private void SpawnItem()
    {
        if (speedUpItemPrefab == null || invincibleItemPrefab == null || timeItemPrefab == null)
        {
            Debug.LogWarning("Item Prefabs are not assigned!");
            return;
        }

        int lane = Random.Range(0, 3);
        GameObject itemPrefabToSpawn;
        Item.ItemType itemType;

        int randomType = Random.Range(0, 3); // 0:SpeedUp, 1:Invincible, 2:Time
        if (randomType == 0) { itemPrefabToSpawn = speedUpItemPrefab; itemType = Item.ItemType.SpeedUp; }
        else if (randomType == 1) { itemPrefabToSpawn = invincibleItemPrefab; itemType = Item.ItemType.Invincible; }
        else { itemPrefabToSpawn = timeItemPrefab; itemType = Item.ItemType.Time; }

        SpriteRenderer prefabSR = itemPrefabToSpawn.GetComponent<SpriteRenderer>();
        float itemHeight = prefabSR != null ? prefabSR.bounds.size.y : 1f;

        float spawnX = GetLaneXPosition(lane, itemPrefabToSpawn);
        float spawnY = worldScreenHeight / 2f + itemHeight / 2f;

        // 重なり防止のための調整
        if (lastSpawnYByLane[lane] > -worldScreenHeight / 2f + gameSettings.objectSpawnOffsetY)
        {
            float minSpawnY = lastSpawnYByLane[lane] + itemHeight + gameSettings.objectSpawnOffsetY;
            spawnY = Mathf.Max(spawnY, minSpawnY);
        }

        GameObject newItem = Instantiate(itemPrefabToSpawn, new Vector3(spawnX, spawnY, 0), Quaternion.identity);
        Item itemScript = newItem.GetComponent<Item>();
        if (itemScript != null)
        {
            itemScript.itemType = itemType; // Itemスクリプトにタイプを設定
        }
        activeItems.Add(newItem);
        lastSpawnYByLane[lane] = newItem.transform.position.y;
    }

    // レーンのX座標を取得するヘルパーメソッド
    private float GetLaneXPosition(int lane, GameObject objPrefab)
    {
        // 画面のワールド座標における幅
        float playerObjectWidth = objPrefab.GetComponent<SpriteRenderer>().bounds.size.x;

        // レーンのワールド幅を計算
        float worldLaneWidth = gameSettings.laneWidth / gameSettings.referenceResolution.x * worldScreenWidth;

        // 各レーンの中心X座標を計算
        // -worldScreenWidth / 2f (左端) + レーンの開始位置 + レーン幅の半分
        float xPos = -worldScreenWidth / 2f + (worldLaneWidth * lane) + (worldLaneWidth / 2f);

        return xPos;
    }

    // UIの更新
    private void UpdateUI()
    {
        livesText.text = $"残機: {lives}";
        timeLeftText.text = $"時間: {Mathf.Max(0, Mathf.FloorToInt(timeLeft))}s";
        distanceText.text = $"{distance:F2}m"; // 小数点以下2桁まで表示

        speedUpUI.SetActive(isSpeedUp);
        if (isSpeedUp)
        {
            speedUpTimerText.text = $"SPEED UP! ({Mathf.CeilToInt(speedUpTimer)}s)";
        }
        invincibleUI.SetActive(isInvincible);
        if (isInvincible)
        {
            invincibleTimerText.text = $"INVINCIBLE! ({Mathf.CeilToInt(invincibleTimer)}s)";
        }
    }

    // UIボタンのクリックハンドラ
    public void OnRetryButtonClicked()
    {
        AudioManager.Instance.clickSE.Play();
        InitGame();
        SetGameState(GameState.Countdown);
        StartCoroutine(StartCountdownCoroutine());
    }

    public void OnBackToTitleButtonClicked()
    {
        AudioManager.Instance.clickSE.Play();
        InitGame();
        SetGameState(GameState.Title);
    }

    // ゲームの状態を設定
    public void SetGameState(GameState newState)
    {
        currentGameState = newState;
        // 全てのUIパネルを非表示にし、必要なものを表示
        titleScreen.SetActive(false);
        countdownScreen.SetActive(false);
        gameOverScreen.SetActive(false);
        
        // ゲーム中のUIはPlaying状態でのみ表示
        livesText.gameObject.SetActive(currentGameState == GameState.Playing);
        timeLeftText.gameObject.SetActive(currentGameState == GameState.Playing);
        distanceText.gameObject.SetActive(currentGameState == GameState.Playing);
        speedUpUI.SetActive(currentGameState == GameState.Playing && isSpeedUp);
        invincibleUI.SetActive(currentGameState == GameState.Playing && isInvincible);


        switch (currentGameState)
        {
            case GameState.Title:
                titleScreen.SetActive(true);
                AudioManager.Instance.PlayTitleBGM();
                break;
            case GameState.Countdown:
                // StartCountdownCoroutine() で画面表示とカウントダウンを管理
                break;
            case GameState.Playing:
                // ゲームプレイ開始時はUIが表示される
                break;
            case GameState.GameOver:
                gameOverScreen.SetActive(true);
                gameOverDistanceText.text = $"距離: {distance:F2}m";
                AudioManager.Instance.StopAllBGM(); //念のためBGM停止
                AudioManager.Instance.gameOverSE.Play();
                break;
        }
    }

    // カウントダウンコルーチン
    IEnumerator StartCountdownCoroutine()
    {
        countdownValue = 3;
        AudioManager.Instance.StopAllBGM();
        countdownScreen.SetActive(true);
        AudioManager.Instance.countdownSE.Play();

        while (countdownValue >= 0)
        {
            countdownText.text = countdownValue == 0 ? "GO!" : countdownValue.ToString();
            yield return new WaitForSeconds(1f); // 1秒待機

            countdownValue--;
            if (countdownValue >= 1)
            {
                AudioManager.Instance.countdownSE.Play();
            }
            else if (countdownValue == 0)
            {
                AudioManager.Instance.goSE.Play();
            }
        }

        countdownScreen.SetActive(false);
        SetGameState(GameState.Playing); // カウントダウン終了後、Playing状態へ
        AudioManager.Instance.PlayGameBGM();
    }

    // プレイヤーと障害物/アイテムの衝突時に呼ばれるメソッド (PlayerControllerから呼び出す)
    public void OnPlayerHitObstacle()
    {
        if (isInvincible)
        {
            AudioManager.Instance.breakObstacleSE.Play();
            // 障害物オブジェクトは、Obstacleスクリプト側でDestroyされるか、
            // GameManagerがDestroyを受け持つ場合は、そのオブジェクトを引数で渡す
        }
        else
        {
            lives--;
            AudioManager.Instance.hitObstacleSE.Play();
            if (lives <= 0)
            {
                SetGameState(GameState.GameOver);
            }
        }
    }

    public void OnPlayerGetItem(Item.ItemType type)
    {
        AudioManager.Instance.getItemSE.Play();
        switch (type)
        {
            case Item.ItemType.SpeedUp:
                isSpeedUp = true;
                speedUpTimer = gameSettings.speedUpDuration;
                break;
            case Item.ItemType.Invincible:
                isInvincible = true;
                invincibleTimer = gameSettings.invincibleDuration;
                playerController.SetInvincibleVisual(true); // プレイヤーの無敵視覚効果を有効化
                break;
            case Item.ItemType.Time:
                timeLeft += gameSettings.timePlusAmount;
                break;
        }
    }

    // 入力処理 (タッチとマウス)
    private void HandleInput()
    {
        // マウス/クリック入力 (UIボタンはUnityのイベントシステムが処理するため、ゲーム画面内でのクリックのみ)
        if (Input.GetMouseButtonDown(0))
        {
            if (currentGameState != GameState.Playing)
            {
                // UIボタン以外での画面クリック
                if (currentGameState == GameState.Title)
                {
                    AudioManager.Instance.clickSE.Play();
                    SetGameState(GameState.Countdown);
                    StartCoroutine(StartCountdownCoroutine());
                }
            }
            else // Playing状態でのクリックはレーン変更
            {
                Vector2 mousePos = Input.mousePosition;
                int clickedLane = Mathf.FloorToInt(mousePos.x / Screen.width * 3); // 画面の横幅を3分割

                if (clickedLane >= 0 && clickedLane <= 2 && clickedLane != playerLane)
                {
                    // 隣接レーンのみへの移動許可（Web版の挙動に合わせる）
                    if (Mathf.Abs(clickedLane - playerLane) == 1)
                    {
                        playerLane = clickedLane;
                        playerController.MovePlayerToLane(playerLane);
                    }
                }
            }
        }

        // タッチ入力 (フリックとタップ)
        if (Input.touchCount > 0)
        {
            Touch touch = Input.GetTouch(0);

            if (touch.phase == TouchPhase.Began)
            {
                touchStartPos = touch.position;
                if (currentGameState != GameState.Playing)
                {
                    AudioManager.Instance.clickSE.Play();
                }
            }
            else if (touch.phase == TouchPhase.Ended)
            {
                Vector2 touchEndPos = touch.position;
                float dx = touchEndPos.x - touchStartPos.x;
                float dy = touchEndPos.y - touchStartPos.y;

                if (currentGameState == GameState.Playing)
                {
                    // フリック判定
                    if (Mathf.Abs(dx) > FLICK_THRESHOLD && Mathf.Abs(dx) > Mathf.Abs(dy))
                    {
                        if (dx > 0) // 右フリック
                        {
                            if (playerLane < 2)
                            {
                                playerLane++;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                        else // 左フリック
                        {
                            if (playerLane > 0)
                            {
                                playerLane--;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                    }
                    else // タップ判定 (フリックではない場合)
                    {
                        // タップ位置に基づいてレーンを決定
                        int clickedLane = Mathf.FloorToInt(touchEndPos.x / Screen.width * 3);

                        if (clickedLane >= 0 && clickedLane <= 2 && clickedLane != playerLane)
                        {
                            if (Mathf.Abs(clickedLane - playerLane) == 1) // 隣接レーンのみ
                            {
                                playerLane = clickedLane;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                    }
                }
                else if (currentGameState == GameState.Title) // タイトル画面でのタップはゲーム開始
                {
                    SetGameState(GameState.Countdown);
                    StartCoroutine(StartCountdownCoroutine());
                }
                // ゲームオーバー画面でのボタンタップはUIイベントで処理される
            }
        }
    }
}