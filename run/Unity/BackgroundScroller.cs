// File: Assets/Scripts/BackgroundScroller.cs
using UnityEngine;

public class BackgroundScroller : MonoBehaviour
{
    public float backgroundHeight; // 背景スプライトのワールド単位での高さ (Inspectorで設定)
    public Transform[] backgroundPieces; // ループする背景スプライトの配列 (通常は2つ)

    private GameManager gameManager;

    void Start()
    {
        gameManager = GameManager.Instance;

        // backgroundPiecesが設定されているか確認
        if (backgroundPieces == null || backgroundPieces.Length == 0)
        {
            Debug.LogError("Background Pieces are not assigned in BackgroundScroller!");
            return;
        }

        // backgroundHeightが0の場合、最初のピースから自動で高さを取得
        if (backgroundHeight == 0f && backgroundPieces[0] != null)
        {
            SpriteRenderer sr = backgroundPieces[0].GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                backgroundHeight = sr.bounds.size.y;
            }
            else
            {
                Debug.LogWarning("BackgroundPiece[0] does not have a SpriteRenderer. Please set backgroundHeight manually.");
            }
        }

        // 初期配置の確認 (例: 2枚の背景を縦に並べる)
        // 背景がWorld Spaceの(0,0)を基準に配置されていると仮定
        // backgroundPieces[0].position = new Vector3(0, 0, 0); // 基準の背景
        // backgroundPieces[1].position = new Vector3(0, backgroundHeight, 0); // その上の背景
    }

    void Update()
    {
        if (gameManager == null || gameManager.currentGameState != GameManager.GameState.Playing) return;

        float currentScrollSpeed = gameManager.GetGameScrollSpeed(); // GameManagerから現在のスクロール速度を取得

        // 各背景ピースを移動
        foreach (Transform piece in backgroundPieces)
        {
            piece.position += Vector3.down * currentScrollSpeed * Time.deltaTime;

            // 画面の下端を越えたら上端に戻す
            // カメラの高さと背景の高さに基づいてリセット位置を決定
            float cameraHalfHeight = Camera.main.orthographicSize;
            if (piece.position.y < -cameraHalfHeight - (backgroundHeight / 2f)) // ピースの下端が画面下を越えた
            {
                // そのピースを他のピースの真上に移動させる
                piece.position += Vector3.up * backgroundHeight * backgroundPieces.Length;
            }
        }
    }
}