// File: Assets/Scripts/AudioManager.cs
using UnityEngine;
using System.Collections; // For Coroutines

public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance; // �V���O���g���p�^�[��

    [Header("BGM")]
    public AudioSource titleBGM;
    public AudioSource gameBGM;
    public AudioSource speedUpLoopSE;

    [Header("SFX")]
    public AudioSource countdownSE;
    public AudioSource goSE;
    public AudioSource runSE; // �A���Đ��p�AOneShot�ł͑Ή�������Ȃ��ꍇ�ɔ����c��
    public AudioSource hitObstacleSE;
    public AudioSource getItemSE;
    public AudioSource breakObstacleSE;
    public AudioSource gameOverSE;
    public AudioSource clickSE;

    [Tooltip("�ꎞ�I��SFX�Đ��Ɏg�p����v���n�u�BAudioSource�R���|�[�l���g���K�v�ł��B")]
    public GameObject sfxOneShotPrefab; // AudioSource�R���|�[�l���g�݂̂����v���n�u

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject); // �V�[���J�ڂ��Ă��j������Ȃ��悤�ɂ���
        }
        else
        {
            Destroy(gameObject); // ���ɃC���X�^���X������Δj������
        }

        // BGM�̃��[�v�ݒ�
        if (titleBGM != null) titleBGM.loop = true;
        if (gameBGM != null) gameBGM.loop = true;
        if (speedUpLoopSE != null) speedUpLoopSE.loop = true;

        // �{�����[���ݒ� (�C��)
        if (titleBGM != null) titleBGM.volume = 0.5f;
        if (gameBGM != null) gameBGM.volume = 0.5f;
        if (speedUpLoopSE != null) speedUpLoopSE.volume = 0.4f;
        if (hitObstacleSE != null) hitObstacleSE.volume = 0.8f;
        if (getItemSE != null) getItemSE.volume = 0.8f;
        if (breakObstacleSE != null) breakObstacleSE.volume = 0.8f;
        if (gameOverSE != null) gameOverSE.volume = 0.8f;
        if (clickSE != null) clickSE.volume = 0.7f;
        if (countdownSE != null) countdownSE.volume = 0.7f;
        if (goSE != null) goSE.volume = 0.7f;
    }

    public void PlayOneShotSFX(AudioClip clip, float volume = 1.0f)
    {
        if (sfxOneShotPrefab != null && clip != null)
        {
            GameObject sfxObj = Instantiate(sfxOneShotPrefab, Vector3.zero, Quaternion.identity);
            AudioSource source = sfxObj.GetComponent<AudioSource>();
            if (source == null)
            {
                source = sfxObj.AddComponent<AudioSource>();
            }
            source.clip = clip;
            source.volume = volume;
            source.Play();
            Destroy(sfxObj, clip.length + 0.1f); // �Đ��I����ɃI�u�W�F�N�g��j��
        }
        else
        {
            Debug.LogWarning("SFX One Shot Prefab or AudioClip is missing in AudioManager.");
        }
    }

    // BGM���䃁�\�b�h
    public void PlayTitleBGM()
    {
        StopAllBGM();
        if (titleBGM != null) titleBGM.Play();
    }

    public void PlayGameBGM()
    {
        StopAllBGM();
        if (gameBGM != null) gameBGM.Play();
    }

    public void StopAllBGM()
    {
        if (titleBGM != null) titleBGM.Stop();
        if (gameBGM != null) gameBGM.Stop();
        if (speedUpLoopSE != null) speedUpLoopSE.Stop();
    }
}