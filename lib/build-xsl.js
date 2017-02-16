let fs = require('fs');

let template = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:variable name="build-hash" select="'SOURCE'" />
</xsl:stylesheet>
`;


module.exports = function (filename, hash) {
  fs.writeFileSync(filename, template.replace('SOURCE', `'${hash}'`));
};