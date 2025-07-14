// File: Assets/Scripts/GameSettings.cs
using UnityEngine;

[CreateAssetMenu(fileName = "GameSettings", menuName = "ScriptableObjects/GameSettings", order = 1)]
public class GameSettings : ScriptableObject
{
    [Header("Game Values")]
    public int initialLives = 3;               // 初期残機数
    public float initialTime = 60f;            // 初期制限時間 (秒)
    public float speedUpDuration = 5f;         // スピードアップアイテム持続時間 (秒)
    public float invincibleDuration = 5f;      // 無敵アイテム持続時間 (秒)
    public float timePlusAmount = 5f;          // 時計アイテムで増える時間 (秒)
    public float playerLaneChangeSpeed = 0.2f; // プレイヤーのレーン変更にかかる時間 (秒)
    public float laneWidth = 133f;             // レーンの幅 (元のCanvas幅 400 / 3レーン ≒ 133)
    public float obstacleInitialSpeed = 8f;    // 障害物の初期スクロール速度 (m/s)
    public int obstacleSpawnIntervalFrames = 80; // 障害物が出現する間隔 (フレーム数、固定タイムステップではないため目安)
    [Range(0f, 1f)]
    public float itemSpawnProbability = 0.002f; // アイテムが出現する確率 (1フレームあたり)
    public float gameSpeedIncrement = 0.0005f; // ゲーム全体の速度が時間とともに増える量 (m/s per frame)
    public float objectSpawnOffsetY = 2f;      // 障害物・アイテムが重ならないようにするためのY座標オフセット (ワールドユニット)

    [Header("World Scaling")]
    public float pixelsPerMeter = 50f;         // 1mを何ピクセルとみなすか (元の48を調整)
    public float metersPerPixel;               // 1ピクセルを何mとみなすか

    [Header("UI Scaling")]
    public Vector2 referenceResolution = new Vector2(400, 600); // UI Canvasの基準解像度

    void OnEnable()
    {
        metersPerPixel = 1f / pixelsPerMeter; // 便利なように計算
    }
}