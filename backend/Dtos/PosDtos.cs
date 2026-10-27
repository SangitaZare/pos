using System.ComponentModel.DataAnnotations;

namespace PosApi.Dtos;

public class ProductDto
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(30)]
    public string Sku { get; set; } = string.Empty;

    [Range(0.01, 1000000)]
    public decimal Price { get; set; }

    [Range(0, 100000)]
    public int StockQuantity { get; set; }

    [Range(0, 1000)]
    public int LowStockThreshold { get; set; } = 5;
}

public class StockAdjustDto
{
    [Range(-100000, 100000)]
    public int Change { get; set; }
}

public class CreateSaleDto
{
    [Required, MinLength(1)]
    public List<SaleLineDto> Items { get; set; } = new();

    [Required]
    public string PaymentMethod { get; set; } = "Cash";
}

public class SaleLineDto
{
    public int ProductId { get; set; }

    [Range(1, 1000)]
    public int Quantity { get; set; }
}