// File: Assets/Scripts/Item.cs
using UnityEngine;

public class Item : MonoBehaviour
{
    public enum ItemType { SpeedUp, Invincible, Time }
    public ItemType itemType;

    // アイテム固有のロジックが必要な場合、ここに記述します。
    // 現状では、SpriteRendererとCollider2D、Rigidbody2Dがあれば十分です。
}