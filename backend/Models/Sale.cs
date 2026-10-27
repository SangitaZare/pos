using System.Net.ServerSentEvents;

namespace PosApi.Models;

public class Sale
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public List<SaleItem> Items { get; set; } = new();
}