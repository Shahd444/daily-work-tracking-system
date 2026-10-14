const { Product } = require('../models');

const PRODUCT_FIELDS = ['serialnumber', 'productname'];
const pick = (source, fields) =>
  fields.reduce((acc, f) => (source[f] !== undefined ? { ...acc, [f]: source[f] } : acc), {});

exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      order: [['product_id', 'ASC']]
    });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(pick(req.body, PRODUCT_FIELDS));
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update(pick(req.body, PRODUCT_FIELDS));
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Product.destroy({
      where: { product_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
