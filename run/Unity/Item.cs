// File: Assets/Scripts/Item.cs
using UnityEngine;

public class Item : MonoBehaviour
{
    public enum ItemType { SpeedUp, Invincible, Time }
    public ItemType itemType;

    // �A�C�e���ŗL�̃��W�b�N���K�v�ȏꍇ�A�����ɋL�q���܂��B
    // ����ł́ASpriteRenderer��Collider2D�ARigidbody2D������Ώ\���ł��B
}