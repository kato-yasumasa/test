// File: Assets/Scripts/GameSettings.cs
using UnityEngine;

[CreateAssetMenu(fileName = "GameSettings", menuName = "ScriptableObjects/GameSettings", order = 1)]
public class GameSettings : ScriptableObject
{
    [Header("Game Values")]
    public int initialLives = 3;               // �����c�@��
    public float initialTime = 60f;            // ������������ (�b)
    public float speedUpDuration = 5f;         // �X�s�[�h�A�b�v�A�C�e���������� (�b)
    public float invincibleDuration = 5f;      // ���G�A�C�e���������� (�b)
    public float timePlusAmount = 5f;          // ���v�A�C�e���ő����鎞�� (�b)
    public float playerLaneChangeSpeed = 0.2f; // �v���C���[�̃��[���ύX�ɂ����鎞�� (�b)
    public float laneWidth = 133f;             // ���[���̕� (����Canvas�� 400 / 3���[�� �� 133)
    public float obstacleInitialSpeed = 8f;    // ��Q���̏����X�N���[�����x (m/s)
    public int obstacleSpawnIntervalFrames = 80; // ��Q�����o������Ԋu (�t���[�����A�Œ�^�C���X�e�b�v�ł͂Ȃ����ߖڈ�)
    [Range(0f, 1f)]
    public float itemSpawnProbability = 0.002f; // �A�C�e�����o������m�� (1�t���[��������)
    public float gameSpeedIncrement = 0.0005f; // �Q�[���S�̂̑��x�����ԂƂƂ��ɑ������ (m/s per frame)
    public float objectSpawnOffsetY = 2f;      // ��Q���E�A�C�e�����d�Ȃ�Ȃ��悤�ɂ��邽�߂�Y���W�I�t�Z�b�g (���[���h���j�b�g)

    [Header("World Scaling")]
    public float pixelsPerMeter = 50f;         // 1m�����s�N�Z���Ƃ݂Ȃ��� (����48�𒲐�)
    public float metersPerPixel;               // 1�s�N�Z������m�Ƃ݂Ȃ���

    [Header("UI Scaling")]
    public Vector2 referenceResolution = new Vector2(400, 600); // UI Canvas�̊�𑜓x

    void OnEnable()
    {
        metersPerPixel = 1f / pixelsPerMeter; // �֗��Ȃ悤�Ɍv�Z
    }
}