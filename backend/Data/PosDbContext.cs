using Microsoft.EntityFrameworkCore;
using PosApi.Models;

namespace PosApi.Data;

public class PosDbContext : DbContext
{
    public PosDbContext(DbContextOptions<PosDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>().HasData(
            new Product { Id = 1, Name = "Cotton T-Shirt", Sku = "TS-001", Price = 499, StockQuantity = 50 },
            new Product { Id = 2, Name = "Denim Jeans", Sku = "JN-001", Price = 1299, StockQuantity = 30 },
            new Product { Id = 3, Name = "Hoodie", Sku = "HD-001", Price = 1599, StockQuantity = 20 }
        );
    }
}