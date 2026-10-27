
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PosApi.Data;
using PosApi.Dtos;      // <-- this one is probably missing
using PosApi.Hubs;
using PosApi.Models;
namespace PosApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly PosDbContext _db;
    private readonly IHubContext<PosHub> _hub;

    public ProductsController(PosDbContext db, IHubContext<PosHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll()
    {
        return await _db.Products.AsNoTracking().OrderBy(p => p.Name).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return product is null ? NotFound() : product;
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(ProductDto dto)
    {
        if (await _db.Products.AnyAsync(p => p.Sku == dto.Sku))
            return Conflict("A product with this SKU already exists.");

        var product = new Product
        {
            Name = dto.Name,
            Sku = dto.Sku,
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            LowStockThreshold = dto.LowStockThreshold
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("ProductChanged", product);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ProductDto dto)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = dto.Name;
        product.Sku = dto.Sku;
        product.Price = dto.Price;
        product.StockQuantity = dto.StockQuantity;
        product.LowStockThreshold = dto.LowStockThreshold;

        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("ProductChanged", product);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        if (await _db.SaleItems.AnyAsync(i => i.ProductId == id))
            return Conflict("This product has sales history and cannot be deleted.");

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("ProductDeleted", id);
        return NoContent();
    }

    // Inventory: restock or correct stock
    [HttpPatch("{id}/stock")]
    public async Task<ActionResult<Product>> AdjustStock(int id, StockAdjustDto dto)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        if (product.StockQuantity + dto.Change < 0)
            return BadRequest("Stock cannot go below zero.");

        product.StockQuantity += dto.Change;
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("StockUpdated", product.Id, product.StockQuantity);
        return product;
    }

    // Inventory: items at or below their low stock threshold
    [HttpGet("low-stock")]
    public async Task<ActionResult<List<Product>>> LowStock()
    {
        return await _db.Products.AsNoTracking()
            .Where(p => p.StockQuantity <= p.LowStockThreshold)
            .ToListAsync();
    }
}