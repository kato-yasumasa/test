// File: Assets/Scripts/PlayerController.cs
using UnityEngine;
using System.Collections;

public class PlayerController : MonoBehaviour
{
    // �X�v���C�g�A�j���[�V�����p�̃X�v���C�g�z�� (Animator���g�p���Ȃ��ꍇ)
    public Sprite[] normalRunSprites;
    public Sprite[] invincibleRunSprites;
    public float frameDuration = 0.1f; // �e�t���[���̕\������

    private SpriteRenderer spriteRenderer;
    private Animator animator; // Animator�R���|�[�l���g (���������)

    private int currentFrame;
    private float frameTimer;
    private bool isInvincibleVisualActive; // ���G���̌����ڂ𔽉f���Ă��邩

    private GameManager gameManager;
    private GameSettings gameSettings;

    private int currentLane;
    private Vector3 targetPosition;
    private Coroutine laneChangeCoroutine;

    void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null) spriteRenderer = gameObject.AddComponent<SpriteRenderer>();

        animator = GetComponent<Animator>(); // Animator������Ύ擾

        // Collider2D��Rigidbody2D���A�^�b�`����Ă��邱�Ƃ��m�F
        if (GetComponent<Collider2D>() == null) gameObject.AddComponent<BoxCollider2D>();
        if (GetComponent<Rigidbody2D>() == null)
        {
            Rigidbody2D rb = gameObject.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic; // �������Z�ɉe������Ȃ��悤��
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
        SetInvincibleVisual(false); // ������Ԃ͖��G�ł͂Ȃ�
        UpdatePlayerPosition(initialLane, true); // �����ɏ����ʒu�ֈړ�
    }

    public void MovePlayerToLane(int targetLane)
    {
        if (laneChangeCoroutine != null)
        {
            StopCoroutine(laneChangeCoroutine); // �����̃��[���ύX���~
        }
        laneChangeCoroutine = StartCoroutine(ChangeLaneSmoothly(targetLane));
        gameManager.playerLane = targetLane; // GameManager�ɂ����݂̃��[����`����
    }

    private void UpdatePlayerPosition(int lane, bool instant = false)
    {
        // ��ʂ̃��[���h���W�ɂ����镝�ƍ����̌v�Z (MainCamera��Orthographic Size�Ɋ�Â�)
        float cameraHalfHeight = Camera.main.orthographicSize;
        float cameraHalfWidth = cameraHalfHeight * Camera.main.aspect;

        // ���[���̃��[���h�����v�Z
        // Canvas��LANE_WIDTH��400px��133px�������̂ŁA���̔䗦�����[���h���ɓK�p
        float worldLaneWidth = gameSettings.laneWidth / gameSettings.settings.referenceResolution.x * (cameraHalfWidth * 2);

        // �v���C���[�̕� (�X�v���C�g�̎��ۂ̕����g�p)
        float playerWidthWorld = spriteRenderer.bounds.size.x;

        // �e���[���̒��SX���W���v�Z
        // ���[��0: ���[, ���[��1: ����, ���[��2: �E�[
        float targetX = -cameraHalfWidth + (worldLaneWidth * lane) + (worldLaneWidth / 2f);

        // �v���C���[��Y���W (��ʉ�������̌Œ�ʒu)
        // ����Canvas�̃v���C���[Y���W�� (CANVAS_HEIGHT - 80) �������̂ŁA��������[���h���W�ɕϊ�
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
        UpdatePlayerPosition(targetLane, false); // �ڕW�ʒu���v�Z (instant��false)
        Vector3 startPosition = transform.position;
        float elapsedTime = 0f;

        while (elapsedTime < gameSettings.playerLaneChangeSpeed)
        {
            transform.position = Vector3.Lerp(startPosition, targetPosition, elapsedTime / gameSettings.playerLaneChangeSpeed);
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        transform.position = targetPosition; // �ŏI�ʒu�ɃZ�b�g
    }


    public void SetInvincibleVisual(bool active)
    {
        isInvincibleVisualActive = active;
        if (animator != null)
        {
            animator.SetBool("IsInvincible", active); // Animator������΃p�����[�^��ݒ�
        }
        // Animator���Ȃ��ꍇ�͎蓮�ŃX�v���C�g���X�V (Update�Ŏ��s)
    }

    void Update()
    {
        // Animator���g�p���Ȃ��ꍇ�̎蓮�A�j���[�V����
        if (animator == null || !animator.enabled)
        {
            frameTimer += Time.deltaTime;
            if (frameTimer >= frameDuration)
            {
                // ���G��Ԃ��ǂ����ŃX�v���C�g�z���؂�ւ���
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