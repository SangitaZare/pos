using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PosApi.Data;
using PosApi.Dtos;      // <-- this one is probably missing
using PosApi.Hubs;
using PosApi.Models;
using QRCoder;
namespace PosApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly PosDbContext _db;
    private readonly IHubContext<PosHub> _hub;

    public SalesController(PosDbContext db, IHubContext<PosHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<Sale>>> GetRecent([FromQuery] int take = 20)
    {
        take = Math.Clamp(take, 1, 100);
        var sales = await _db.Sales.AsNoTracking()
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .OrderByDescending(s => s.Id)
            .Take(take)
            .ToListAsync();
        return sales;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Sale>> GetById(int id)
    {
        var sale = await _db.Sales.AsNoTracking()
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == id);
        return sale is null ? NotFound() : sale;
    }

    [HttpPost]
    public async Task<ActionResult<Sale>> Create(CreateSaleDto dto)
    {
        // Merge duplicate lines (same product added twice)
        var lines = dto.Items
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();

        var ids = lines.Select(l => l.ProductId).ToList();
        var products = await _db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        var sale = new Sale { PaymentMethod = dto.PaymentMethod };

        foreach (var line in lines)
        {
            if (!products.TryGetValue(line.ProductId, out var product))
                return BadRequest($"Product {line.ProductId} does not exist.");

            if (product.StockQuantity < line.Quantity)
                return BadRequest($"Not enough stock for {product.Name}. Available: {product.StockQuantity}.");

            product.StockQuantity -= line.Quantity;   // reduce inventory

            sale.Items.Add(new SaleItem
            {
                ProductId = product.Id,
                Quantity = line.Quantity,
                UnitPrice = product.Price             // server decides the price
            });
        }

        sale.TotalAmount = sale.Items.Sum(i => i.UnitPrice * i.Quantity);

        _db.Sales.Add(sale);
        await _db.SaveChangesAsync();   // sale + items + stock changes saved together

        // Tell every connected screen
        await _hub.Clients.All.SendAsync("SaleCreated", new
        {
            sale.Id,
            sale.TotalAmount,
            sale.PaymentMethod,
            sale.CreatedAt,
            ItemCount = sale.Items.Sum(i => i.Quantity)
        });

        foreach (var p in products.Values)
            await _hub.Clients.All.SendAsync("StockUpdated", p.Id, p.StockQuantity);

        return CreatedAtAction(nameof(GetById), new { id = sale.Id }, sale);
    }
    // Returns a PNG QR code that points to the receipt page for this sale
    [HttpGet("{id}/qr")]
    public async Task<IActionResult> GetReceiptQr(int id, [FromServices] IConfiguration config)
    {
        var exists = await _db.Sales.AnyAsync(s => s.Id == id);
        if (!exists) return NotFound();

        var baseUrl = config["ReceiptBaseUrl"] ?? "http://localhost:4200/receipt";
        var receiptUrl = $"{baseUrl}/{id}";

        using var generator = new QRCodeGenerator();
        using var qrData = generator.CreateQrCode(receiptUrl, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(qrData);
        byte[] bytes = png.GetGraphic(10);

        return File(bytes, "image/png");
    }
}