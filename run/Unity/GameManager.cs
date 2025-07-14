// File: Assets/Scripts/GameManager.cs
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI; // UI�v�f���g�p���邽��

public class GameManager : MonoBehaviour
{
    public static GameManager Instance; // �V���O���g���p�^�[��

    [Header("Settings")]
    public GameSettings gameSettings; // GameSettings ScriptableObject��Inspector�Ŋ��蓖�Ă�

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

    // �Q�[���̏��
    public enum GameState { Title, Countdown, Playing, GameOver }
    public GameState currentGameState;

    // �Q�[���ϐ�
    private int lives;
    private float timeLeft;
    private float distance;
    public int playerLane; // 0:��, 1:����, 2:�E (public�ɂ���PlayerController������A�N�Z�X�\��)
    private List<GameObject> activeObstacles = new List<GameObject>();
    private List<GameObject> activeItems = new List<GameObject>();
    private float baseGameSpeed; // �x�[�X�ƂȂ�X�N���[�����x (���ԂƂƂ��ɑ���)

    public bool isSpeedUp;
    private float speedUpTimer;
    public bool isInvincible;
    private float invincibleTimer;

    private int countdownValue;
    private float frameCount; // ��Q�������Ԋu�̃J�E���g�p

    private float lastRunSESpawnTime;
    private const float RUN_SE_INTERVAL = 0.2f; // ����SE�̍Đ��Ԋu

    // �I�u�W�F�N�g�̏d�Ȃ�h�~�p (���[�����Ƃ̍Ō�̃X�|�[��Y���W)
    private float[] lastSpawnYByLane = new float[3];

    // Flick���͗p
    private Vector2 touchStartPos;
    private const float FLICK_THRESHOLD = 50f; // �t���b�N�ƔF������臒l (�s�N�Z��)

    [Header("Prefabs")]
    public GameObject playerPrefab;
    public GameObject[] obstaclePrefabs; // �����̏�Q���^�C�v������ꍇ
    public GameObject speedUpItemPrefab;
    public GameObject invincibleItemPrefab;
    public GameObject timeItemPrefab;

    private PlayerController playerController; // �v���C���[�̃X�N���v�g�Q��

    // World units for canvas dimensions (�J������Orthographic Size�ƃA�X�y�N�g��Ōv�Z)
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

        // �{�^���̃��X�i�[��ݒ�
        if (retryButton != null) retryButton.onClick.AddListener(OnRetryButtonClicked);
        if (backToTitleButton != null) backToTitleButton.onClick.AddListener(OnBackToTitleButtonClicked);

        // �J�����̃T�C�Y�Ɋ�Â������[���h�X�N���[���T�C�Y���v�Z
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
        float deltaTime = Time.deltaTime; // �t���[���Ԃ̎���

        HandleInput(); // ���͏���

        // UI�͏�ɍX�V�i��Ԃɂ�����炸�j
        UpdateUI();

        switch (currentGameState)
        {
            case GameState.Playing:
                UpdatePlayingState(deltaTime);
                break;
            // ���̏�Ԃł́AUpdate()�Ōp���I�ȏ����͍s��Ȃ�
        }
    }

    // �Q�[���̃X�N���[�����x���擾����w���p�[���\�b�h
    public float GetGameScrollSpeed()
    {
        float currentScrollSpeed = baseGameSpeed;
        if (isSpeedUp)
        {
            currentScrollSpeed *= 2;
        }
        return currentScrollSpeed;
    }

    // �Q�[���̏�����
    public void InitGame()
    {
        lives = gameSettings.initialLives;
        timeLeft = gameSettings.initialTime;
        distance = 0;
        playerLane = 1; // �������[��
        baseGameSpeed = gameSettings.obstacleInitialSpeed; // �x�[�X�̑��x�������l��

        isSpeedUp = false;
        speedUpTimer = 0;
        isInvincible = false;
        invincibleTimer = 0;

        frameCount = 0;
        
        // �����̏�Q���ƃA�C�e�����N���A
        foreach (GameObject obj in activeObstacles) Destroy(obj);
        activeObstacles.Clear();
        foreach (GameObject obj in activeItems) Destroy(obj);
        activeItems.Clear();

        // �e���[���̍ŏI�X�|�[��Y���W�����Z�b�g
        for (int i = 0; i < lastSpawnYByLane.Length; i++)
        {
            lastSpawnYByLane[i] = -worldScreenHeight / 2f; // ��ʉ��[��菭����
        }

        // �v���C���[�̐����܂��͏�����
        if (playerController == null)
        {
            GameObject playerObj = Instantiate(playerPrefab);
            playerController = playerObj.GetComponent<PlayerController>();
        }
        playerController.InitPlayer(playerLane);
        playerController.SetInvincibleVisual(false); // ���G��Ԃ�����

        AudioManager.Instance.StopAllBGM(); // ���ׂĂ�BGM���~
        UpdateUI(); // UI��������ԂɍX�V
    }

    // �Q�[���v���C���̍X�V���W�b�N
    private void UpdatePlayingState(float deltaTime)
    {
        baseGameSpeed += gameSettings.gameSpeedIncrement * deltaTime; // ���ԂƂƂ��ɃQ�[�����x���グ��

        float currentScrollSpeed = GetGameScrollSpeed(); // ���݂̃X�N���[�����x

        // ���Ԃ̌���
        timeLeft -= deltaTime;
        if (timeLeft <= 0)
        {
            timeLeft = 0;
            SetGameState(GameState.GameOver);
            AudioManager.Instance.StopAllBGM();
            AudioManager.Instance.gameOverSE.Play();
            return;
        }

        // �����̑���
        distance += currentScrollSpeed * deltaTime; // m/s�Ȃ̂ł��̂܂܋����ɉ��Z

        // �X�s�[�h�A�b�v���ʂ̊Ǘ�
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

        // ���G���ʂ̊Ǘ�
        if (isInvincible)
        {
            invincibleTimer -= deltaTime;
            if (invincibleTimer <= 0)
            {
                isInvincible = false;
                invincibleTimer = 0;
                playerController.SetInvincibleVisual(false); // �v���C���[�̖��G���o���ʂ�����
            }
        }

        // ����SE�̍Đ� (�A���I�ɍĐ�)
        if (Time.time - lastRunSESpawnTime > RUN_SE_INTERVAL)
        {
            if (AudioManager.Instance.runSE != null) {
                 AudioManager.Instance.PlayOneShotSFX(AudioManager.Instance.runSE.clip);
            }
            lastRunSESpawnTime = Time.time;
        }

        // ��Q���E�A�C�e���̐���
        frameCount++;
        if (frameCount >= gameSettings.obstacleSpawnIntervalFrames)
        {
            SpawnObstacle();
            frameCount = 0; // �t���[���J�E���g�����Z�b�g
        }

        if (Random.value < gameSettings.itemSpawnProbability)
        {
            SpawnItem();
        }

        // �Փ˔��� (Unity��Physics�V�X�e���Ŏ����I�Ɍ��o����邪�A�����ł͎蓮�Ń��X�g���Ǘ�)
        CheckCollisions();

        // ��Q���E�A�C�e���̈ʒu�X�V�Ɖ�ʊO�폜�́A�e�I�u�W�F�N�g�̃R���|�[�l���g�ŊǗ����Ă��ǂ����A
        // �����ňꊇ�ŏ�������i�Q�[���S�̂̃X�N���[�����x�Ɉˑ����邽�߁j
        UpdateScrollingObjects(currentScrollSpeed, activeObstacles);
        UpdateScrollingObjects(currentScrollSpeed, activeItems);
    }

    private void UpdateScrollingObjects(float scrollSpeed, List<GameObject> objectList)
    {
        for (int i = objectList.Count - 1; i >= 0; i--)
        {
            GameObject obj = objectList[i];
            if (obj == null) // �I�u�W�F�N�g�����łɔj�󂳂�Ă���\��
            {
                objectList.RemoveAt(i);
                continue;
            }

            obj.transform.position += Vector3.down * scrollSpeed * Time.deltaTime;

            // ��ʊO�ɏo���I�u�W�F�N�g���폜
            if (obj.transform.position.y < -worldScreenHeight / 2f - (obj.GetComponent<SpriteRenderer>().bounds.size.y / 2f))
            {
                Destroy(obj);
                objectList.RemoveAt(i);
            }
        }
    }

    // �Փ˔��胍�W�b�N (OnTriggerEnter2D���g�p���邽�߁A�����ɂ͒��ڏ����Ȃ����A�A�C�e�����Q���Ƃ̐ڐG�ŌĂ΂�郁�\�b�h��z��)
    private void CheckCollisions()
    {
        // �Փ˔���͊e�I�u�W�F�N�g��OnTriggerEnter2D�ōs���邽�߁A�����ł̓��X�g�̊Ǘ��̂�
        // GameManager�͏Փ˂̌��ʁi���C�t�����A�A�C�e���擾�Ȃǁj���󂯎��`�ɂȂ�
    }

    // ��Q���̐���
    private void SpawnObstacle()
    {
        if (obstaclePrefabs == null || obstaclePrefabs.Length == 0)
        {
            Debug.LogWarning("Obstacle Prefabs are not assigned!");
            return;
        }

        int lane = Random.Range(0, 3); // 0:��, 1:����, 2:�E
        GameObject chosenObstaclePrefab = obstaclePrefabs[Random.Range(0, obstaclePrefabs.Length)];
        SpriteRenderer prefabSR = chosenObstaclePrefab.GetComponent<SpriteRenderer>();
        float obstacleHeight = prefabSR != null ? prefabSR.bounds.size.y : 1f; // �v���n�u�̃X�v���C�g�̍������擾

        // �X�|�[���ʒu (��ʏ�[����)
        float spawnX = GetLaneXPosition(lane, chosenObstaclePrefab);
        float spawnY = worldScreenHeight / 2f + obstacleHeight / 2f; // ��ʏ�[

        // �d�Ȃ�h�~�̂��߂̒���
        if (lastSpawnYByLane[lane] > -worldScreenHeight / 2f + gameSettings.objectSpawnOffsetY) // ���[���ɑO��̃I�u�W�F�N�g������ꍇ
        {
            // �O��X�|�[�������I�u�W�F�N�g��Y���W + ���̃I�u�W�F�N�g�̍��� + �I�t�Z�b�g
            float minSpawnY = lastSpawnYByLane[lane] + obstacleHeight + gameSettings.objectSpawnOffsetY;
            spawnY = Mathf.Max(spawnY, minSpawnY);
        }
        
        GameObject newObstacle = Instantiate(chosenObstaclePrefab, new Vector3(spawnX, spawnY, 0), Quaternion.identity);
        activeObstacles.Add(newObstacle);
        lastSpawnYByLane[lane] = newObstacle.transform.position.y; // �X�|�[�������I�u�W�F�N�g�̎��ۂ�Y���W���L�^
    }

    // �A�C�e���̐���
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

        // �d�Ȃ�h�~�̂��߂̒���
        if (lastSpawnYByLane[lane] > -worldScreenHeight / 2f + gameSettings.objectSpawnOffsetY)
        {
            float minSpawnY = lastSpawnYByLane[lane] + itemHeight + gameSettings.objectSpawnOffsetY;
            spawnY = Mathf.Max(spawnY, minSpawnY);
        }

        GameObject newItem = Instantiate(itemPrefabToSpawn, new Vector3(spawnX, spawnY, 0), Quaternion.identity);
        Item itemScript = newItem.GetComponent<Item>();
        if (itemScript != null)
        {
            itemScript.itemType = itemType; // Item�X�N���v�g�Ƀ^�C�v��ݒ�
        }
        activeItems.Add(newItem);
        lastSpawnYByLane[lane] = newItem.transform.position.y;
    }

    // ���[����X���W���擾����w���p�[���\�b�h
    private float GetLaneXPosition(int lane, GameObject objPrefab)
    {
        // ��ʂ̃��[���h���W�ɂ����镝
        float playerObjectWidth = objPrefab.GetComponent<SpriteRenderer>().bounds.size.x;

        // ���[���̃��[���h�����v�Z
        float worldLaneWidth = gameSettings.laneWidth / gameSettings.referenceResolution.x * worldScreenWidth;

        // �e���[���̒��SX���W���v�Z
        // -worldScreenWidth / 2f (���[) + ���[���̊J�n�ʒu + ���[�����̔���
        float xPos = -worldScreenWidth / 2f + (worldLaneWidth * lane) + (worldLaneWidth / 2f);

        return xPos;
    }

    // UI�̍X�V
    private void UpdateUI()
    {
        livesText.text = $"�c�@: {lives}";
        timeLeftText.text = $"����: {Mathf.Max(0, Mathf.FloorToInt(timeLeft))}s";
        distanceText.text = $"{distance:F2}m"; // �����_�ȉ�2���܂ŕ\��

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

    // UI�{�^���̃N���b�N�n���h��
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

    // �Q�[���̏�Ԃ�ݒ�
    public void SetGameState(GameState newState)
    {
        currentGameState = newState;
        // �S�Ă�UI�p�l�����\���ɂ��A�K�v�Ȃ��̂�\��
        titleScreen.SetActive(false);
        countdownScreen.SetActive(false);
        gameOverScreen.SetActive(false);
        
        // �Q�[������UI��Playing��Ԃł̂ݕ\��
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
                // StartCountdownCoroutine() �ŉ�ʕ\���ƃJ�E���g�_�E�����Ǘ�
                break;
            case GameState.Playing:
                // �Q�[���v���C�J�n����UI���\�������
                break;
            case GameState.GameOver:
                gameOverScreen.SetActive(true);
                gameOverDistanceText.text = $"����: {distance:F2}m";
                AudioManager.Instance.StopAllBGM(); //�O�̂���BGM��~
                AudioManager.Instance.gameOverSE.Play();
                break;
        }
    }

    // �J�E���g�_�E���R���[�`��
    IEnumerator StartCountdownCoroutine()
    {
        countdownValue = 3;
        AudioManager.Instance.StopAllBGM();
        countdownScreen.SetActive(true);
        AudioManager.Instance.countdownSE.Play();

        while (countdownValue >= 0)
        {
            countdownText.text = countdownValue == 0 ? "GO!" : countdownValue.ToString();
            yield return new WaitForSeconds(1f); // 1�b�ҋ@

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
        SetGameState(GameState.Playing); // �J�E���g�_�E���I����APlaying��Ԃ�
        AudioManager.Instance.PlayGameBGM();
    }

    // �v���C���[�Ə�Q��/�A�C�e���̏Փˎ��ɌĂ΂�郁�\�b�h (PlayerController����Ăяo��)
    public void OnPlayerHitObstacle()
    {
        if (isInvincible)
        {
            AudioManager.Instance.breakObstacleSE.Play();
            // ��Q���I�u�W�F�N�g�́AObstacle�X�N���v�g����Destroy����邩�A
            // GameManager��Destroy���󂯎��ꍇ�́A���̃I�u�W�F�N�g�������œn��
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
                playerController.SetInvincibleVisual(true); // �v���C���[�̖��G���o���ʂ�L����
                break;
            case Item.ItemType.Time:
                timeLeft += gameSettings.timePlusAmount;
                break;
        }
    }

    // ���͏��� (�^�b�`�ƃ}�E�X)
    private void HandleInput()
    {
        // �}�E�X/�N���b�N���� (UI�{�^����Unity�̃C�x���g�V�X�e�����������邽�߁A�Q�[����ʓ��ł̃N���b�N�̂�)
        if (Input.GetMouseButtonDown(0))
        {
            if (currentGameState != GameState.Playing)
            {
                // UI�{�^���ȊO�ł̉�ʃN���b�N
                if (currentGameState == GameState.Title)
                {
                    AudioManager.Instance.clickSE.Play();
                    SetGameState(GameState.Countdown);
                    StartCoroutine(StartCountdownCoroutine());
                }
            }
            else // Playing��Ԃł̃N���b�N�̓��[���ύX
            {
                Vector2 mousePos = Input.mousePosition;
                int clickedLane = Mathf.FloorToInt(mousePos.x / Screen.width * 3); // ��ʂ̉�����3����

                if (clickedLane >= 0 && clickedLane <= 2 && clickedLane != playerLane)
                {
                    // �אڃ��[���݂̂ւ̈ړ����iWeb�ł̋����ɍ��킹��j
                    if (Mathf.Abs(clickedLane - playerLane) == 1)
                    {
                        playerLane = clickedLane;
                        playerController.MovePlayerToLane(playerLane);
                    }
                }
            }
        }

        // �^�b�`���� (�t���b�N�ƃ^�b�v)
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
                    // �t���b�N����
                    if (Mathf.Abs(dx) > FLICK_THRESHOLD && Mathf.Abs(dx) > Mathf.Abs(dy))
                    {
                        if (dx > 0) // �E�t���b�N
                        {
                            if (playerLane < 2)
                            {
                                playerLane++;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                        else // ���t���b�N
                        {
                            if (playerLane > 0)
                            {
                                playerLane--;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                    }
                    else // �^�b�v���� (�t���b�N�ł͂Ȃ��ꍇ)
                    {
                        // �^�b�v�ʒu�Ɋ�Â��ă��[��������
                        int clickedLane = Mathf.FloorToInt(touchEndPos.x / Screen.width * 3);

                        if (clickedLane >= 0 && clickedLane <= 2 && clickedLane != playerLane)
                        {
                            if (Mathf.Abs(clickedLane - playerLane) == 1) // �אڃ��[���̂�
                            {
                                playerLane = clickedLane;
                                playerController.MovePlayerToLane(playerLane);
                            }
                        }
                    }
                }
                else if (currentGameState == GameState.Title) // �^�C�g����ʂł̃^�b�v�̓Q�[���J�n
                {
                    SetGameState(GameState.Countdown);
                    StartCoroutine(StartCountdownCoroutine());
                }
                // �Q�[���I�[�o�[��ʂł̃{�^���^�b�v��UI�C�x���g�ŏ��������
            }
        }
    }
}