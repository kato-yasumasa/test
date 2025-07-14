// File: Assets/Scripts/AudioManager.cs
using UnityEngine;
using System.Collections; // For Coroutines

public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance; // シングルトンパターン

    [Header("BGM")]
    public AudioSource titleBGM;
    public AudioSource gameBGM;
    public AudioSource speedUpLoopSE;

    [Header("SFX")]
    public AudioSource countdownSE;
    public AudioSource goSE;
    public AudioSource runSE; // 連続再生用、OneShotでは対応しきれない場合に備え残す
    public AudioSource hitObstacleSE;
    public AudioSource getItemSE;
    public AudioSource breakObstacleSE;
    public AudioSource gameOverSE;
    public AudioSource clickSE;

    [Tooltip("一時的なSFX再生に使用するプレハブ。AudioSourceコンポーネントが必要です。")]
    public GameObject sfxOneShotPrefab; // AudioSourceコンポーネントのみを持つプレハブ

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject); // シーン遷移しても破棄されないようにする
        }
        else
        {
            Destroy(gameObject); // 既にインスタンスがあれば破棄する
        }

        // BGMのループ設定
        if (titleBGM != null) titleBGM.loop = true;
        if (gameBGM != null) gameBGM.loop = true;
        if (speedUpLoopSE != null) speedUpLoopSE.loop = true;

        // ボリューム設定 (任意)
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
            Destroy(sfxObj, clip.length + 0.1f); // 再生終了後にオブジェクトを破棄
        }
        else
        {
            Debug.LogWarning("SFX One Shot Prefab or AudioClip is missing in AudioManager.");
        }
    }

    // BGM制御メソッド
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