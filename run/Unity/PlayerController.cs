// File: Assets/Scripts/PlayerController.cs
using UnityEngine;
using System.Collections;

public class PlayerController : MonoBehaviour
{
    // スプライトアニメーション用のスプライト配列 (Animatorを使用しない場合)
    public Sprite[] normalRunSprites;
    public Sprite[] invincibleRunSprites;
    public float frameDuration = 0.1f; // 各フレームの表示時間

    private SpriteRenderer spriteRenderer;
    private Animator animator; // Animatorコンポーネント (もしあれば)

    private int currentFrame;
    private float frameTimer;
    private bool isInvincibleVisualActive; // 無敵時の見た目を反映しているか

    private GameManager gameManager;
    private GameSettings gameSettings;

    private int currentLane;
    private Vector3 targetPosition;
    private Coroutine laneChangeCoroutine;

    void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null) spriteRenderer = gameObject.AddComponent<SpriteRenderer>();

        animator = GetComponent<Animator>(); // Animatorがあれば取得

        // Collider2DとRigidbody2Dがアタッチされていることを確認
        if (GetComponent<Collider2D>() == null) gameObject.AddComponent<BoxCollider2D>();
        if (GetComponent<Rigidbody2D>() == null)
        {
            Rigidbody2D rb = gameObject.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic; // 物理演算に影響されないように
        }
    }

    void Start()
    {
        gameManager = GameManager.Instance;
        gameSettings = gameManager.gameSettings;
    }

    public void InitPlayer(int initialLane)
    {
        currentLane = initialLane;
        currentFrame = 0;
        frameTimer = 0;
        SetInvincibleVisual(false); // 初期状態は無敵ではない
        UpdatePlayerPosition(initialLane, true); // 即座に初期位置へ移動
    }

    public void MovePlayerToLane(int targetLane)
    {
        if (laneChangeCoroutine != null)
        {
            StopCoroutine(laneChangeCoroutine); // 既存のレーン変更を停止
        }
        laneChangeCoroutine = StartCoroutine(ChangeLaneSmoothly(targetLane));
        gameManager.playerLane = targetLane; // GameManagerにも現在のレーンを伝える
    }

    private void UpdatePlayerPosition(int lane, bool instant = false)
    {
        // 画面のワールド座標における幅と高さの計算 (MainCameraのOrthographic Sizeに基づく)
        float cameraHalfHeight = Camera.main.orthographicSize;
        float cameraHalfWidth = cameraHalfHeight * Camera.main.aspect;

        // レーンのワールド幅を計算
        // CanvasのLANE_WIDTHが400px中133pxだったので、その比率をワールド幅に適用
        float worldLaneWidth = gameSettings.laneWidth / gameSettings.settings.referenceResolution.x * (cameraHalfWidth * 2);

        // プレイヤーの幅 (スプライトの実際の幅を使用)
        float playerWidthWorld = spriteRenderer.bounds.size.x;

        // 各レーンの中心X座標を計算
        // レーン0: 左端, レーン1: 中央, レーン2: 右端
        float targetX = -cameraHalfWidth + (worldLaneWidth * lane) + (worldLaneWidth / 2f);

        // プレイヤーのY座標 (画面下部からの固定位置)
        // 元のCanvasのプレイヤーY座標が (CANVAS_HEIGHT - 80) だったので、それをワールド座標に変換
        float playerBaseYPixel = gameSettings.referenceResolution.y - 80f;
        float playerBaseYWorld = -cameraHalfHeight + (playerBaseYPixel / gameSettings.referenceResolution.y * (cameraHalfHeight * 2));

        targetPosition = new Vector3(targetX, playerBaseYWorld, 0);

        if (instant)
        {
            transform.position = targetPosition;
        }
    }

    IEnumerator ChangeLaneSmoothly(int targetLane)
    {
        UpdatePlayerPosition(targetLane, false); // 目標位置を計算 (instantはfalse)
        Vector3 startPosition = transform.position;
        float elapsedTime = 0f;

        while (elapsedTime < gameSettings.playerLaneChangeSpeed)
        {
            transform.position = Vector3.Lerp(startPosition, targetPosition, elapsedTime / gameSettings.playerLaneChangeSpeed);
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        transform.position = targetPosition; // 最終位置にセット
    }


    public void SetInvincibleVisual(bool active)
    {
        isInvincibleVisualActive = active;
        if (animator != null)
        {
            animator.SetBool("IsInvincible", active); // Animatorがあればパラメータを設定
        }
        // Animatorがない場合は手動でスプライトを更新 (Updateで実行)
    }

    void Update()
    {
        // Animatorを使用しない場合の手動アニメーション
        if (animator == null || !animator.enabled)
        {
            frameTimer += Time.deltaTime;
            if (frameTimer >= frameDuration)
            {
                // 無敵状態かどうかでスプライト配列を切り替える
                Sprite[] currentSprites = isInvincibleVisualActive ? invincibleRunSprites : normalRunSprites;

                if (currentSprites != null && currentSprites.Length > 0)
                {
                    currentFrame = (currentFrame + 1) % currentSprites.Length;
                    spriteRenderer.sprite = currentSprites[currentFrame];
                }
                frameTimer -= frameDuration;
            }
        }
    }
}