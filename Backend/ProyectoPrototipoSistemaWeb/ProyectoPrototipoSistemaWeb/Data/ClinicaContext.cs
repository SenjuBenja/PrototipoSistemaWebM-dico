using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

public partial class ClinicaContext : DbContext
{
    public ClinicaContext()
    {
    }

    public ClinicaContext(DbContextOptions<ClinicaContext> options)
        : base(options)
    {
    }

    public virtual DbSet<CatalogoSexo> CatalogoSexos { get; set; }

    public virtual DbSet<Citum> Cita { get; set; }

    public virtual DbSet<Informe> Informes { get; set; }

    public virtual DbSet<Medico> Medicos { get; set; }

    public virtual DbSet<Paciente> Pacientes { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=localhost;Database=tesisdb;User Id=user1;Password=benji1307;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Citum>(entity =>
        {
            entity.HasOne(d => d.Paciente).WithMany(p => p.Cita)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cita_Paciente");
        });

        modelBuilder.Entity<Informe>(entity =>
        {
            entity.Property(e => e.InformeFecha).HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.Cita).WithMany(p => p.Informes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Informe_Cita");
        });

        modelBuilder.Entity<Paciente>(entity =>
        {
            entity.HasOne(d => d.Sexo).WithMany(p => p.Pacientes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Paciente_Sexo");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
