// File: Assets/Scripts/BackgroundScroller.cs
using UnityEngine;

public class BackgroundScroller : MonoBehaviour
{
    public float backgroundHeight; // �w�i�X�v���C�g�̃��[���h�P�ʂł̍��� (Inspector�Őݒ�)
    public Transform[] backgroundPieces; // ���[�v����w�i�X�v���C�g�̔z�� (�ʏ��2��)

    private GameManager gameManager;

    void Start()
    {
        gameManager = GameManager.Instance;

        // backgroundPieces���ݒ肳��Ă��邩�m�F
        if (backgroundPieces == null || backgroundPieces.Length == 0)
        {
            Debug.LogError("Background Pieces are not assigned in BackgroundScroller!");
            return;
        }

        // backgroundHeight��0�̏ꍇ�A�ŏ��̃s�[�X���玩���ō������擾
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

        // �����z�u�̊m�F (��: 2���̔w�i���c�ɕ��ׂ�)
        // �w�i��World Space��(0,0)����ɔz�u����Ă���Ɖ���
        // backgroundPieces[0].position = new Vector3(0, 0, 0); // ��̔w�i
        // backgroundPieces[1].position = new Vector3(0, backgroundHeight, 0); // ���̏�̔w�i
    }

    void Update()
    {
        if (gameManager == null || gameManager.currentGameState != GameManager.GameState.Playing) return;

        float currentScrollSpeed = gameManager.GetGameScrollSpeed(); // GameManager���猻�݂̃X�N���[�����x���擾

        // �e�w�i�s�[�X���ړ�
        foreach (Transform piece in backgroundPieces)
        {
            piece.position += Vector3.down * currentScrollSpeed * Time.deltaTime;

            // ��ʂ̉��[���z�������[�ɖ߂�
            // �J�����̍����Ɣw�i�̍����Ɋ�Â��ă��Z�b�g�ʒu������
            float cameraHalfHeight = Camera.main.orthographicSize;
            if (piece.position.y < -cameraHalfHeight - (backgroundHeight / 2f)) // �s�[�X�̉��[����ʉ����z����
            {
                // ���̃s�[�X�𑼂̃s�[�X�̐^��Ɉړ�������
                piece.position += Vector3.up * backgroundHeight * backgroundPieces.Length;
            }
        }
    }
}