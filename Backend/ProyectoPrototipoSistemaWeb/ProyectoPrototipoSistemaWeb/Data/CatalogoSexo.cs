using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

[Table("CatalogoSexo")]
[Index("SexoNombre", Name = "UQ_CatalogoSexo_Nombre", IsUnique = true)]
public partial class CatalogoSexo
{
    [Key]
    [Column("sexoId")]
    public int SexoId { get; set; }

    [Column("sexoNombre")]
    [StringLength(20)]
    [Unicode(false)]
    public string SexoNombre { get; set; } = null!;

    [InverseProperty("Sexo")]
    public virtual ICollection<Paciente> Pacientes { get; set; } = new List<Paciente>();
}
