using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

[Table("Informe")]
public partial class Informe
{
    [Key]
    [Column("informeId")]
    public int InformeId { get; set; }

    [Column("citaId")]
    public int CitaId { get; set; }

    [Column("informeDescripcion")]
    [StringLength(300)]
    [Unicode(false)]
    public string? InformeDescripcion { get; set; }

    [Column("informeFecha", TypeName = "datetime")]
    public DateTime InformeFecha { get; set; }

    [ForeignKey("CitaId")]
    [InverseProperty("Informes")]
    public virtual Citum Cita { get; set; } = null!;
}
