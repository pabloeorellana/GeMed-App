// @desc    Obtener lista de profesionales públicos
// @route   GET /api/public/professionals
// @access  Público
export const getPublicProfessionals = async (req, res) => {
    const pool = req.dbPool;
    try {
        const [professionals] = await pool.query(`
            SELECT u.id, u.fullName, u.profileImageUrl, p.specialty, p.description 
            FROM Users u
            JOIN Professionals p ON u.id = p.userId
            WHERE u.isActive = TRUE AND u.role = 'PROFESSIONAL'
        `);
        res.json(professionals);
    } catch (error) {
        console.error("Error en getPublicProfessionals:", error);
        res.status(500).json({ message: "Error al obtener profesionales." });
    }
};